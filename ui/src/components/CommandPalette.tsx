/**
 * The search window that opens with Ctrl+K (⌘K on a Mac) or the "Search" button in the header: type a few letters
 * of a feature, a screen or a project and press Enter to go there.
 *
 * It uses Mantine's Spotlight. Its list ("actions") is built from data the app has already loaded:
 *  - the screens of the open project (Overview, Features, Rules, ...),
 *  - every feature of the open project, by code and name,
 *  - every project.
 * `spotlight.open()` (imported from '@mantine/spotlight') opens it from anywhere, e.g. the header button.
 */
import { Spotlight, type SpotlightActionData, type SpotlightActionGroupData } from '@mantine/spotlight';
import { IconFlag, IconFolder, IconSearch, type Icon } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useFeatures } from '../api/features';
import { useProjects } from '../api/projects';

/** A screen of a project, as listed in the side menu (AppLayout passes its own list, so both stay the same). */
export interface ProjectScreen {
  path: string;
  label: string;
  icon: Icon;
}

export function CommandPalette({ projectId, screens }: { projectId: number | null; screens: ProjectScreen[] }) {
  const navigate = useNavigate();
  const projects = useProjects();
  // Without an open project there are no features to list, so nothing is loaded (the second argument, `enabled`)
  const features = useFeatures(projectId ?? 0, projectId !== null);

  const groups: SpotlightActionGroupData[] = [];

  if (projectId !== null) {
    const projectName = projects.data?.find((project) => project.id === projectId)?.name ?? 'this project';
    const screenActions: SpotlightActionData[] = [];
    for (const screen of screens) {
      const ScreenIcon = screen.icon;
      screenActions.push({
        id: `screen-${screen.path}`,
        label: screen.label,
        description: `Go to ${screen.label.toLowerCase()} of ${projectName}`,
        leftSection: <ScreenIcon size={18} />,
        onClick: () => navigate(`/projects/${projectId}${screen.path}`),
      });
    }
    groups.push({ group: 'Screens', actions: screenActions });

    const featureActions: SpotlightActionData[] = [];
    for (const feature of features.data ?? []) {
      featureActions.push({
        id: `feature-${feature.id}`,
        label: feature.code,
        description: feature.name,
        // Searched too, though not shown
        keywords: [feature.description ?? ''],
        leftSection: <IconFlag size={18} />,
        onClick: () => navigate(`/projects/${projectId}/features/${feature.id}`),
      });
    }
    if (featureActions.length > 0) {
      groups.push({ group: 'Features', actions: featureActions });
    }
  }

  const projectActions: SpotlightActionData[] = [];
  for (const project of projects.data ?? []) {
    projectActions.push({
      id: `project-${project.id}`,
      label: project.name,
      description: project.description || 'Open the project overview',
      leftSection: <IconFolder size={18} />,
      onClick: () => navigate(`/projects/${project.id}`),
    });
  }
  groups.push({ group: 'Projects', actions: projectActions });

  return (
    <Spotlight
      actions={groups}
      shortcut={['mod + K', '/']}
      limit={12}
      highlightQuery
      nothingFound="Nothing found"
      searchProps={{ leftSection: <IconSearch size={18} />, placeholder: 'Search features, screens and projects…', 'aria-label': 'Search' }}
      radius="lg"
    />
  );
}
