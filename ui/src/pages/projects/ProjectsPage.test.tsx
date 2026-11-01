import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { fetchProjects } from '../../api/projects';
import { createTestProject, renderPage, uniqueName } from '../../../test/render';

describe('ProjectsPage', () => {
  test('lists a created project with its description', async () => {
    const project = await createTestProject({ description: 'Listed by the projects page test' });

    renderPage('/projects');

    const link = await screen.findByRole('link', { name: project.name });
    expect(link).toHaveAttribute('href', `/projects/${project.id}`);
    expect(screen.getByText('Listed by the projects page test')).toBeInTheDocument();
  });

  test('creates a project through the dialog; an empty name is refused in the browser', async () => {
    const { user } = renderPage('/projects');
    await user.click(await screen.findByRole('button', { name: 'New project' }));
    const dialog = await screen.findByRole('dialog', { name: 'New project' });

    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Name is required')).toBeInTheDocument();

    const name = uniqueName('ui-new-project');
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), name);
    await user.type(within(dialog).getByRole('textbox', { name: 'Description' }), 'Made in the dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('link', { name })).toBeInTheDocument();
    expect(await screen.findByText(`Project "${name}" saved.`)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New project' })).not.toBeInTheDocument());
    const saved = (await fetchProjects()).find((candidate) => candidate.name === name);
    expect(saved?.description).toBe('Made in the dialog');
  });

  test('deletes an empty project after asking', async () => {
    const project = await createTestProject();
    const { user } = renderPage('/projects');

    await user.click(await screen.findByRole('button', { name: `Delete project ${project.name}` }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete?' });
    expect(within(dialog).getByText(`Delete project ${project.name}? This cannot be undone.`)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('link', { name: project.name })).not.toBeInTheDocument());
    expect((await fetchProjects()).map((candidate) => candidate.id)).not.toContain(project.id);
  });
});
