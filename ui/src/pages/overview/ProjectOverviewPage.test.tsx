import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  createTestEnvironment,
  createTestFeature,
  createTestProject,
  createTestQualifier,
  createTestRule,
  findRow,
  renderPage,
} from '../../../test/render';

const IN_A_WEEK = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

/**
 * A project with two environments (DEV, PROD), one qualifier and three features: ACTIVE_ONE has an active rule in DEV,
 * LATER has a scheduled rule in PROD, and BARE has no rules.
 */
async function createProjectWithRules() {
  const project = await createTestProject({ description: 'Overview test project' });
  const dev = await createTestEnvironment(project.id, { code: 'DEV' });
  const prod = await createTestEnvironment(project.id, { code: 'PROD' });
  const qualifier = await createTestQualifier(project.id);
  const active = await createTestFeature(project.id, { code: 'ACTIVE_ONE' });
  const later = await createTestFeature(project.id, { code: 'LATER' });
  await createTestFeature(project.id, { code: 'BARE' });
  await createTestRule({ featureId: active.id, environmentId: dev.id, qualifierId: qualifier.id });
  await createTestRule({
    featureId: later.id,
    environmentId: prod.id,
    qualifierId: qualifier.id,
    qualifierValue: 'NL',
    effectiveFrom: IN_A_WEEK,
  });
  return { project, qualifier };
}

/** The stat card (a link) whose label is `label`, e.g. "Features". */
function statCard(label: string): HTMLElement {
  return screen.getByRole('link', { name: new RegExp(`^${label}\\s*\\d`) });
}

describe('ProjectOverviewPage', () => {
  test('counts features, rules by status, environments and qualifiers', async () => {
    const { project, qualifier } = await createProjectWithRules();

    renderPage(`/projects/${project.id}`);

    expect(await screen.findByRole('heading', { name: project.name, level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Overview test project')).toBeInTheDocument();

    const features = statCard('Features');
    expect(within(features).getByText('3')).toBeInTheDocument();
    expect(within(features).getByText('1 without any rule')).toBeInTheDocument();
    expect(features).toHaveAttribute('href', `/projects/${project.id}/features`);

    const rules = statCard('Rules');
    expect(within(rules).getByText('2')).toBeInTheDocument();
    expect(within(rules).getByText('1 active · 1 scheduled · 0 expired · 0 disabled')).toBeInTheDocument();

    const environments = statCard('Environments');
    expect(within(environments).getByText('2')).toBeInTheDocument();
    expect(within(environments).getByText('DEV, PROD')).toBeInTheDocument();

    const qualifiers = statCard('Qualifiers');
    expect(within(qualifiers).getByText('1')).toBeInTheDocument();
    expect(within(qualifiers).getByText(qualifier.code)).toBeInTheDocument();
  });

  test('the features × environments grid counts active rules per cell', async () => {
    const { project } = await createProjectWithRules();

    renderPage(`/projects/${project.id}`);

    const headers = (await screen.findAllByRole('columnheader')).map((header) => header.textContent);
    expect(headers).toEqual(['Feature', 'DEV', 'PROD']);

    // One active rule in DEV, nothing in PROD
    const activeCells = within(await findRow('ACTIVE_ONE')).getAllByRole('cell');
    expect(activeCells.map((cell) => cell.textContent)).toEqual(['ACTIVE_ONE', '1', '–']);

    // A scheduled rule is a rule, but not an active one: 0 of 1
    const laterCells = within(await findRow('LATER')).getAllByRole('cell');
    expect(laterCells.map((cell) => cell.textContent)).toEqual(['LATER', '–', '0 / 1']);

    const bareCells = within(await findRow('BARE')).getAllByRole('cell');
    expect(bareCells.map((cell) => cell.textContent)).toEqual(['BARE', '–', '–']);

    expect(within(activeCells[0]).getByRole('link', { name: 'ACTIVE_ONE' })).toHaveAttribute(
      'href',
      expect.stringMatching(new RegExp(`^/projects/${project.id}/features/\\d+$`)),
    );
  });

  test('a scheduled rule is listed under "Starting soon"', async () => {
    const { project, qualifier } = await createProjectWithRules();

    renderPage(`/projects/${project.id}`);

    const startingSoon = (await screen.findByRole('heading', { name: 'Starting soon' })).parentElement!;
    expect(within(startingSoon).getByRole('link', { name: 'LATER' })).toBeInTheDocument();
    expect(within(startingSoon).getByText('PROD')).toBeInTheDocument();
    expect(within(startingSoon).getByText(qualifier.code, { exact: false })).toHaveTextContent(`${qualifier.code} is NL`);
    expect(within(startingSoon).getByText(/^starts /)).toBeInTheDocument();
    expect(within(startingSoon).queryByRole('link', { name: 'ACTIVE_ONE' })).not.toBeInTheDocument();

    const endingSoon = screen.getByRole('heading', { name: 'Ending soon' }).parentElement!;
    expect(within(endingSoon).getByText('No active rule has an end date.')).toBeInTheDocument();
  });
});
