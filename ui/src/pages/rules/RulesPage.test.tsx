import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { chooseOption, createTestEnvironment, createTestRule, createTestSetup, renderPage } from '../../../test/render';

const IN_A_WEEK = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

/** The texts of the "When" column of the rows shown, e.g. "COUNTRYisNL". */
function shownConditions(): string[] {
  const table = screen.queryAllByRole('table')[0];
  if (!table) {
    return [];
  }
  const header = within(table).getAllByRole('columnheader').map((cell) => cell.textContent);
  const whenColumn = header.indexOf('When');
  return within(within(table).getAllByRole('rowgroup')[1])
    .getAllByRole('row')
    .map((row) => within(row).getAllByRole('cell')[whenColumn].textContent ?? '');
}

describe('RulesPage', () => {
  test('the environment and status filters narrow the table', async () => {
    const { project, environment: dev, qualifier, feature } = await createTestSetup();
    const prod = await createTestEnvironment(project.id);
    const base = { featureId: feature.id, qualifierId: qualifier.id };
    await createTestRule({ ...base, environmentId: dev.id, qualifierValue: 'dev-on' });
    await createTestRule({ ...base, environmentId: dev.id, qualifierValue: 'dev-off', enabled: false });
    await createTestRule({ ...base, environmentId: prod.id, qualifierValue: 'prod-on' });
    await createTestRule({ ...base, environmentId: prod.id, qualifierValue: 'prod-later', effectiveFrom: IN_A_WEEK });
    const { user } = renderPage(`/projects/${project.id}/rules`);

    expect(await screen.findByText('4 of 4 rules')).toBeInTheDocument();
    // Grouped by environment in the project's order (known once the environments are loaded): DEV's rules first
    await waitFor(() =>
      expect(shownConditions()).toEqual([
        `${qualifier.code}isdev-on`,
        `${qualifier.code}isdev-off`,
        `${qualifier.code}isprod-on`,
        `${qualifier.code}isprod-later`,
      ]),
    );

    await chooseOption(user, 'Environment', prod.code);
    expect(await screen.findByText('2 of 4 rules')).toBeInTheDocument();
    expect(shownConditions()).toEqual([`${qualifier.code}isprod-on`, `${qualifier.code}isprod-later`]);

    await chooseOption(user, 'Status', 'Scheduled');
    expect(await screen.findByText('1 of 4 rules')).toBeInTheDocument();
    expect(shownConditions()).toEqual([`${qualifier.code}isprod-later`]);

    // DEV has no scheduled rule
    await chooseOption(user, 'Environment', dev.code);
    expect(await screen.findByText('0 of 4 rules')).toBeInTheDocument();
    expect(screen.getByText('No rule matches the filters')).toBeInTheDocument();
    expect(shownConditions()).toEqual([]);

    await chooseOption(user, 'Status', 'Disabled');
    expect(await screen.findByText('1 of 4 rules')).toBeInTheDocument();
    expect(shownConditions()).toEqual([`${qualifier.code}isdev-off`]);
  });

  test('the search box matches values', async () => {
    const { project, environment, qualifier, feature } = await createTestSetup();
    const base = { featureId: feature.id, environmentId: environment.id, qualifierId: qualifier.id };
    await createTestRule({ ...base, qualifierValue: 'DE', featureValue: 'german' });
    await createTestRule({ ...base, qualifierValue: 'NL', featureValue: 'dutch' });
    const { user } = renderPage(`/projects/${project.id}/rules`);
    expect(await screen.findByText('2 of 2 rules')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'dutch');

    expect(await screen.findByText('1 of 2 rules')).toBeInTheDocument();
    expect(shownConditions()).toEqual([`${qualifier.code}isNL`]);
  });

  test('a status button filters by that status; pressing it again shows all', async () => {
    const { project, environment, qualifier, feature } = await createTestSetup();
    const base = { featureId: feature.id, environmentId: environment.id, qualifierId: qualifier.id };
    await createTestRule({ ...base, qualifierValue: 'on' });
    await createTestRule({ ...base, qualifierValue: 'off', enabled: false });
    const { user } = renderPage(`/projects/${project.id}/rules`);
    expect(await screen.findByText('2 of 2 rules')).toBeInTheDocument();

    const disabled = screen.getByRole('button', { name: 'Show only disabled rules' });
    expect(disabled).toHaveTextContent('Disabled1');
    await user.click(disabled);

    expect(await screen.findByText('1 of 2 rules')).toBeInTheDocument();
    expect(shownConditions()).toEqual([`${qualifier.code}isoff`]);
    expect(screen.getByRole('textbox', { name: 'Status' })).toHaveValue('Disabled');

    await user.click(disabled);
    expect(await screen.findByText('2 of 2 rules')).toBeInTheDocument();
  });

  test('"Clear filters" resets every filter', async () => {
    const { project, environment, qualifier, feature } = await createTestSetup();
    await createTestRule({ featureId: feature.id, environmentId: environment.id, qualifierId: qualifier.id, qualifierValue: 'DE' });
    const { user } = renderPage(`/projects/${project.id}/rules`);
    expect(await screen.findByText('1 of 1 rules')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'nothing-like-this');
    expect(await screen.findByText('0 of 1 rules')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('1 of 1 rules')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('');
  });
});
