/**
 * The trail above a project page's title: Projects › <project name> › <the page>, e.g.
 *   useProjectBreadcrumbs(projectId, { label: 'Features' })
 *   useProjectBreadcrumbs(projectId, { label: 'Features', to: '/projects/1/features' }, { label: 'NEW_CHECKOUT' })
 * The project name comes from the cached project list (the header's picker loads it anyway).
 */
import { useProjects } from '../api/projects';
import type { Crumb } from '../components/PageHeader';

export function useProjectBreadcrumbs(projectId: number, ...rest: Crumb[]): Crumb[] {
  const projects = useProjects();
  const name = projects.data?.find((project) => project.id === projectId)?.name ?? 'Project';
  const trail: Crumb[] = [
    { label: 'Projects', to: '/projects' },
    // On the overview the project is the current page (no link); elsewhere it links to the overview
    { label: name, to: rest.length > 0 ? `/projects/${projectId}` : undefined },
  ];
  for (const crumb of rest) {
    trail.push(crumb);
  }
  return trail;
}
