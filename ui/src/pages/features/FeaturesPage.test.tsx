import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { fetchFeatures } from '../../api/features';
import { waitForEvidence } from '../../../test/evidence';
import {
  createTestFeature,
  createTestRule,
  createTestSetup,
  findNotifiedRequestId,
  findRow,
  renderPage,
} from '../../../test/render';

describe('FeaturesPage', () => {
  test('the search box narrows the list by code, name or description', async () => {
    const { project } = await createTestSetup();
    await createTestFeature(project.id, { code: 'DARK_MODE', name: 'Dark mode' });
    await createTestFeature(project.id, { code: 'NEW_CHECKOUT', name: 'Checkout', description: 'One-page payment flow' });
    const { user } = renderPage(`/projects/${project.id}/features`);
    await findRow('DARK_MODE');

    const search = screen.getByRole('textbox', { name: 'Search features' });
    await user.type(search, 'checkout');
    await waitFor(() => expect(screen.queryByText('DARK_MODE')).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'NEW_CHECKOUT' })).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'PAYMENT');
    expect(screen.getByRole('link', { name: 'NEW_CHECKOUT' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'DARK_MODE' })).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'nothing like this');
    expect(await screen.findByText('No feature matches the search')).toBeInTheDocument();
  });

  test('shows "No rules yet" for a feature without rules, and the environments of one with rules', async () => {
    const { project, environment, qualifier, feature } = await createTestSetup();
    const bare = await createTestFeature(project.id);
    await createTestRule({ featureId: feature.id, environmentId: environment.id, qualifierId: qualifier.id });

    renderPage(`/projects/${project.id}/features`);

    expect(within(await findRow(bare.code)).getByText('No rules yet')).toBeInTheDocument();
    const configured = await findRow(feature.code);
    expect(within(configured).queryByText('No rules yet')).not.toBeInTheDocument();
    expect(within(configured).getByText(`${environment.code} 1`)).toBeInTheDocument();
  });

  test('creating a feature through the dialog opens its page', async () => {
    const { project, environment } = await createTestSetup();
    const { user } = renderPage(`/projects/${project.id}/features`);

    await user.click(await screen.findByRole('button', { name: 'New feature' }));
    const dialog = await screen.findByRole('dialog', { name: 'New feature' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Code' }), 'one click buy');
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'One-click buy');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    // The feature's own page: its title and one tab per environment
    expect(await screen.findByRole('heading', { name: /ONE_CLICK_BUY\s*One-click buy/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: `${environment.code} (0)` })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New feature' })).not.toBeInTheDocument());
    expect((await fetchFeatures(project.id)).map((feature) => feature.code)).toContain('ONE_CLICK_BUY');
  });

  test("a duplicate code shows the backend's message and request id, and the dialog stays open", async () => {
    const { project, feature } = await createTestSetup();
    const { user } = renderPage(`/projects/${project.id}/features`);

    await user.click(await screen.findByRole('button', { name: 'New feature' }));
    const dialog = await screen.findByRole('dialog', { name: 'New feature' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Code' }), feature.code.toLowerCase());
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Same code again');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    const requestId = await findNotifiedRequestId(`A feature with code '${feature.code}' already exists in this project.`);
    expect(requestId).toMatch(/^ui-/);
    expect(screen.getByRole('dialog', { name: 'New feature' })).toBeInTheDocument();
    // In act(): the Save button's spinner is still animating away while these wait for the backend
    const evidence = await act(() => waitForEvidence(requestId));
    expect(evidence).toMatchObject({ method: 'POST', path: '/api/features', status: 400 });
    const features = await act(() => fetchFeatures(project.id));
    expect(features.map((item) => item.id)).toEqual([feature.id]);
  });
});
