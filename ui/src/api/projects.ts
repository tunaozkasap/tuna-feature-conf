/**
 * Projects: plain API calls first, then the React hooks the screens use.
 *
 * The same layout repeats in environments.ts, qualifiers.ts, features.ts and rules.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, searchAll } from './http';
import { queryKeys } from './queryKeys';
import type { Project, ProjectInput, ProjectResponse } from './types';

// ---- API calls ---------------------------------------------------------------------------------------------------

export function fetchProjects(): Promise<Project[]> {
  return searchAll<Project>('/api/projects/search', [], [{ field: 'name', direction: 'ASC' }]);
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const response = await apiRequest<ProjectResponse>('POST', '/api/projects', { data: input });
  return response.data as Project;
}

export async function updateProject(id: number, input: ProjectInput): Promise<Project> {
  const response = await apiRequest<ProjectResponse>('PUT', `/api/projects/${id}`, { data: input });
  return response.data as Project;
}

export async function deleteProject(id: number): Promise<void> {
  await apiRequest('DELETE', `/api/projects/${id}`);
}

// ---- Hooks for the screens ---------------------------------------------------------------------------------------

/** All projects, sorted by name. */
export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
}

/** Creates the project, or updates it when an `id` is given. */
export function useSaveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ProjectInput }) =>
      id ? updateProject(id, input) : createProject(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}
