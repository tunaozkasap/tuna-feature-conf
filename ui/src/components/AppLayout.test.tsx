import { screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { createTestFeature, createTestProject, findRow, renderPage, type RenderedPage } from '../../test/render';

/** Two projects with one feature each. */
async function createTwoProjects() {
  const first = await createTestProject();
  const second = await createTestProject();
  const [firstFeature, secondFeature] = await Promise.all([createTestFeature(first.id), createTestFeature(second.id)]);
  return { first, second, firstFeature, secondFeature };
}

async function pickProject({ user }: RenderedPage, name: string): Promise<void> {
  const picker = screen.getByRole('textbox', { name: 'Project' });
  await user.clear(picker);
  await user.type(picker, name);
  await user.click(await screen.findByRole('option', { name }));
}

describe('AppLayout', () => {
  test('the project picker switches to another project and stays in the same section', async () => {
    const { first, second, firstFeature, secondFeature } = await createTwoProjects();
    const page = renderPage(`/projects/${first.id}/features`);
    await findRow(firstFeature.code);
    // The picker loads the project list on its own (every project, so it can be the last request to answer)
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Project' })).toHaveValue(first.name));

    await pickProject(page, second.name);

    expect(await findRow(secondFeature.code)).toBeInTheDocument();
    expect(screen.queryByText(firstFeature.code)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Features', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Project' })).toHaveValue(second.name);
    expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', `/projects/${second.id}/features`);
  });

  test("from a feature's page, switching project goes to the other project's feature list", async () => {
    const { first, second, firstFeature, secondFeature } = await createTwoProjects();
    const page = renderPage(`/projects/${first.id}/features/${firstFeature.id}`);
    expect(await screen.findByRole('heading', { name: new RegExp(firstFeature.code) })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Project' })).toHaveValue(first.name));

    await pickProject(page, second.name);

    expect(await findRow(secondFeature.code)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Features', level: 2 })).toBeInTheDocument();
  });
});
