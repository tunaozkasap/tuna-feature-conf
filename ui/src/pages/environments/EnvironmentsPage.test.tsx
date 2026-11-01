import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { fetchEnvironments } from '../../api/environments';
import { waitForEvidence } from '../../../test/evidence';
import {
  createTestEnvironment,
  createTestRule,
  createTestSetup,
  findNotifiedRequestId,
  findRow,
  renderPage,
} from '../../../test/render';

describe('EnvironmentsPage', () => {
  test('lists the environments in creation order with their rule counts', async () => {
    const { project, environment, qualifier, feature } = await createTestSetup();
    const empty = await createTestEnvironment(project.id, { name: 'Empty one', description: 'Nothing here' });
    await createTestRule({ featureId: feature.id, environmentId: environment.id, qualifierId: qualifier.id, qualifierValue: 'A' });
    await createTestRule({ featureId: feature.id, environmentId: environment.id, qualifierId: qualifier.id, qualifierValue: 'B' });

    renderPage(`/projects/${project.id}/environments`);

    const withRules = within(await findRow(environment.code)).getAllByRole('cell');
    expect(withRules.map((cell) => cell.textContent).slice(0, 4)).toEqual([environment.code, environment.name, '', '2']);
    const withoutRules = within(await findRow(empty.code)).getAllByRole('cell');
    expect(withoutRules.map((cell) => cell.textContent).slice(0, 4)).toEqual([empty.code, 'Empty one', 'Nothing here', '0']);

    const rows = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([environment.code, empty.code]);
  });

  test('creates an environment through the dialog, with its code in upper case', async () => {
    const { project } = await createTestSetup();
    const { user } = renderPage(`/projects/${project.id}/environments`);

    await user.click(await screen.findByRole('button', { name: 'New environment' }));
    const dialog = await screen.findByRole('dialog', { name: 'New environment' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Code' }), 'pre prod');
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Pre-production');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    const cells = within(await findRow('PRE_PROD')).getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('Pre-production');
    expect(cells[3]).toHaveTextContent('0');
    expect(await screen.findByText('Environment PRE_PROD saved.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New environment' })).not.toBeInTheDocument());
    expect((await fetchEnvironments(project.id)).map((item) => item.code)).toContain('PRE_PROD');
  });

  test("deleting an environment that still has a rule shows the backend's message and request id, and keeps it", async () => {
    const { project, environment, qualifier, feature } = await createTestSetup();
    await createTestRule({ featureId: feature.id, environmentId: environment.id, qualifierId: qualifier.id });
    const { user } = renderPage(`/projects/${project.id}/environments`);

    await user.click(await screen.findByRole('button', { name: `Delete environment ${environment.code}` }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete?' });
    expect(within(dialog).getByText('It still has 1 rule(s); delete them first.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    const requestId = await findNotifiedRequestId('This environment still has feature rules. Delete or move them first.');
    expect(requestId).toMatch(/^ui-/);
    expect(await waitForEvidence(requestId)).toMatchObject({ method: 'DELETE', status: 400, severity: 'WARN' });

    // The dialog stays open on failure; after closing it, the environment is still listed
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete?' })).not.toBeInTheDocument());
    expect(await findRow(environment.code)).toBeInTheDocument();
    expect((await fetchEnvironments(project.id)).map((item) => item.id)).toEqual([environment.id]);
  });
});
