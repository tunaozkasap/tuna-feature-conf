/**
 * Names for the cached data (TanStack Query "query keys").
 *
 * TanStack Query keeps every loaded list in a cache under a key. Screens that ask for the same key share one request
 * and one copy of the data. After a save, the hooks "invalidate" keys, which makes every screen showing that data
 * load it again.
 *
 * Everything inside a project starts with `['project', projectId]`, so one call can refresh all of a project's data.
 */
export const queryKeys = {
  projects: ['projects'] as const,
  project: (projectId: number) => ['project', projectId] as const,
  environments: (projectId: number) => ['project', projectId, 'environments'] as const,
  qualifiers: (projectId: number) => ['project', projectId, 'qualifiers'] as const,
  features: (projectId: number) => ['project', projectId, 'features'] as const,
  rules: (projectId: number) => ['project', projectId, 'rules'] as const,
};
