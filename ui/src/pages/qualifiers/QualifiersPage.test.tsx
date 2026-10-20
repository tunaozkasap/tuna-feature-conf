import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { fetchQualifiers } from '../../api/qualifiers';
import {
  chooseOption,
  createTestQualifier,
  createTestRule,
  createTestSetup,
  findRow,
  renderPage,
} from '../../../test/render';

/** The texts of the cells of every body row, in the order shown. */
function bodyRows(): string[][] {
  const rows = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');
  return rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent ?? ''));
}

describe('QualifiersPage', () => {
  test('lists the qualifiers highest priority first, with value type and rule count', async () => {
    // createTestSetup's qualifier is TEXT with priority 0
    const { project, environment, qualifier: lowest, feature } = await createTestSetup();
    const highest = await createTestQualifier(project.id, 'BOOLEAN', { priority: 50, description: 'Beta testers' });
    const middle = await createTestQualifier(project.id, 'NUMERIC', { priority: 5 });
    await createTestRule({ featureId: feature.id, environmentId: environment.id, qualifierId: highest.id, qualifierValue: 'true' });

    renderPage(`/projects/${project.id}/qualifiers`);
    await findRow(highest.code);

    const rows = bodyRows();
    expect(rows.map((cells) => cells.slice(0, 4))).toEqual([
      ['50', highest.code, highest.name, 'BOOLEAN'],
      ['5', middle.code, middle.name, 'NUMERIC'],
      ['0', lowest.code, lowest.name, 'TEXT'],
    ]);
    expect(rows.map((cells) => cells[4])).toEqual(['Beta testers', '', '']);
    expect(rows.map((cells) => cells[5])).toEqual(['1', '0', '0']);
  });

  test('creates a qualifier through the dialog with its value type and priority', async () => {
    const { project, qualifier: existing } = await createTestSetup();
    const { user } = renderPage(`/projects/${project.id}/qualifiers`);
    await findRow(existing.code);

    await user.click(screen.getByRole('button', { name: 'New qualifier' }));
    const dialog = await screen.findByRole('dialog', { name: 'New qualifier' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Code' }), 'cart total');
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Cart total');
    await chooseOption(user, 'Value type', 'Number (e.g. 1042)');
    const priority = within(dialog).getByRole('textbox', { name: 'Priority' });
    await user.clear(priority);
    await user.type(priority, '20');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Qualifier CART_TOTAL saved.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New qualifier' })).not.toBeInTheDocument());
    await findRow('CART_TOTAL');
    expect(bodyRows().map((cells) => cells.slice(0, 4))).toEqual([
      ['20', 'CART_TOTAL', 'Cart total', 'NUMERIC'],
      ['0', existing.code, existing.name, 'TEXT'],
    ]);
    const saved = (await fetchQualifiers(project.id)).find((qualifier) => qualifier.code === 'CART_TOTAL');
    expect(saved).toMatchObject({ valueType: 'NUMERIC', priority: 20 });
  });
});
