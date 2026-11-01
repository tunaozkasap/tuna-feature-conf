import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { fetchRules } from '../../api/rules';
import {
  chooseOption,
  createTestEnvironment,
  createTestQualifier,
  createTestRule,
  createTestSetup,
  renderPage,
} from '../../../test/render';

/** The rows of the rules table that is shown (the selected tab's). */
function ruleRows(): HTMLElement[] {
  return within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');
}

/** The table row of rule `ruleId`, found by its on/off switch. */
function ruleRow(ruleId: number): HTMLElement {
  return screen.getByRole('switch', { name: `Rule ${ruleId} switched on` }).closest('tr')!;
}

describe('FeatureDetailPage', () => {
  test('one tab per environment with its rule count; a tab shows only its own rules', async () => {
    const { project, environment: first, qualifier, feature } = await createTestSetup();
    const second = await createTestEnvironment(project.id);
    await createTestRule({ featureId: feature.id, environmentId: first.id, qualifierId: qualifier.id, qualifierValue: 'A' });
    await createTestRule({ featureId: feature.id, environmentId: first.id, qualifierId: qualifier.id, qualifierValue: 'B' });
    await createTestRule({ featureId: feature.id, environmentId: second.id, qualifierId: qualifier.id, qualifierValue: 'C' });
    const { user } = renderPage(`/projects/${project.id}/features/${feature.id}`);

    const firstTab = await screen.findByRole('tab', { name: `${first.code} (2)` });
    const secondTab = screen.getByRole('tab', { name: `${second.code} (1)` });
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
    expect(ruleRows()).toHaveLength(2);

    await user.click(secondTab);
    expect(await screen.findByRole('button', { name: `Add rule in ${second.code}` })).toBeInTheDocument();
    expect(ruleRows()).toHaveLength(1);
    expect(ruleRows()[0]).toHaveTextContent(`${qualifier.code}isC`);
  });

  test('lists the rules in evaluation order: a higher-priority qualifier first, whatever the rule priority', async () => {
    const { project, environment, feature } = await createTestSetup();
    const low = await createTestQualifier(project.id, 'TEXT', { priority: 1 });
    const high = await createTestQualifier(project.id, 'TEXT', { priority: 50 });
    // Created first and with a higher rule priority, yet checked last
    await createTestRule({ featureId: feature.id, environmentId: environment.id, qualifierId: low.id, qualifierValue: 'low', priority: 9 });
    await createTestRule({ featureId: feature.id, environmentId: environment.id, qualifierId: high.id, qualifierValue: 'high', priority: 0 });
    renderPage(`/projects/${project.id}/features/${feature.id}`);

    await screen.findByRole('tab', { name: `${environment.code} (2)` });
    const rows = ruleRows();
    expect(within(rows[0]).getAllByRole('cell')[0]).toHaveTextContent('1');
    expect(rows[0]).toHaveTextContent(`${high.code}ishigh`);
    expect(within(rows[1]).getAllByRole('cell')[0]).toHaveTextContent('2');
    expect(rows[1]).toHaveTextContent(`${low.code}islow`);
  });

  test('adds a rule through the dialog, with true/false for a BOOLEAN qualifier', async () => {
    const { project, environment, feature } = await createTestSetup();
    const beta = await createTestQualifier(project.id, 'BOOLEAN', { name: 'Beta tester' });
    const { user } = renderPage(`/projects/${project.id}/features/${feature.id}`);

    await user.click(await screen.findByRole('button', { name: `Add rule in ${environment.code}` }));
    const dialog = await screen.findByRole('dialog', { name: `New rule for ${feature.code}` });
    expect(within(dialog).getByRole('textbox', { name: 'Feature' })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: 'Environment' })).toHaveValue(`${environment.code} — ${environment.name}`);

    // Nothing filled in yet: the browser refuses
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Choose a qualifier')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter the value to match')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter the value the feature gets')).toBeInTheDocument();

    await chooseOption(user, 'Qualifier', `${beta.code} — Beta tester (BOOLEAN, priority 0)`);
    expect(within(dialog).getByRole('radio', { name: 'true' })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'false' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: 'true' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Value' }), 'beta-on');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('tab', { name: `${environment.code} (1)` })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [row] = ruleRows();
    expect(row).toHaveTextContent(`${beta.code}istrue`);
    expect(row).toHaveTextContent('beta-on');
    expect(within(row).getByText('Active')).toBeInTheDocument();
    expect(await fetchRules(project.id)).toEqual([
      expect.objectContaining({ qualifierId: beta.id, qualifierValue: 'true', featureValue: 'beta-on', enabled: true }),
    ]);
  });

  test('switching a rule off makes it Disabled', async () => {
    const { project, environment, qualifier, feature } = await createTestSetup();
    const rule = await createTestRule({ featureId: feature.id, environmentId: environment.id, qualifierId: qualifier.id });
    const { user } = renderPage(`/projects/${project.id}/features/${feature.id}`);

    const onOff = await screen.findByRole('switch', { name: `Rule ${rule.id} switched on` });
    expect(onOff).toBeChecked();
    expect(within(ruleRow(rule.id)).getByText('Active')).toBeInTheDocument();

    await user.click(onOff);

    expect(await within(ruleRow(rule.id)).findByText('Disabled')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: `Rule ${rule.id} switched on` })).not.toBeChecked();
    expect(await fetchRules(project.id)).toEqual([expect.objectContaining({ id: rule.id, enabled: false })]);
  });

  test('deletes a rule after asking', async () => {
    const { project, environment, qualifier, feature } = await createTestSetup();
    const rule = await createTestRule({ featureId: feature.id, environmentId: environment.id, qualifierId: qualifier.id, qualifierValue: 'NL' });
    const { user } = renderPage(`/projects/${project.id}/features/${feature.id}`);

    await user.click(await screen.findByRole('button', { name: `Delete this rule (${qualifier.code} is NL)` }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(`No rules in ${environment.code}`)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: `${environment.code} (0)` })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: `Rule ${rule.id} switched on` })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await fetchRules(project.id)).toEqual([]);
  });
});
