/** Environments of a project (DEV, STAGING, PROD, ...). Same layout as projects.ts. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, inProject, searchAll } from './http';
import { queryKeys } from './queryKeys';
import type { Environment, EnvironmentInput, EnvironmentResponse } from './types';

// ---- API calls ---------------------------------------------------------------------------------------------------

export function fetchEnvironments(projectId: number): Promise<Environment[]> {
  return searchAll<Environment>('/api/environments/search', [inProject(projectId)], [{ field: 'id', direction: 'ASC' }]);
}

export async function createEnvironment(input: EnvironmentInput): Promise<Environment> {
  const response = await apiRequest<EnvironmentResponse>('POST', '/api/environments', { data: input });
  return response.data as Environment;
}

export async function updateEnvironment(id: number, input: EnvironmentInput): Promise<Environment> {
  const response = await apiRequest<EnvironmentResponse>('PUT', `/api/environments/${id}`, { data: input });
  return response.data as Environment;
}

export async function deleteEnvironment(id: number): Promise<void> {
  await apiRequest('DELETE', `/api/environments/${id}`);
}

// ---- Hooks for the screens ---------------------------------------------------------------------------------------

/** The project's environments in the order they were created (usually DEV first, PROD last). */
export function useEnvironments(projectId: number) {
  return useQuery({ queryKey: queryKeys.environments(projectId), queryFn: () => fetchEnvironments(projectId) });
}

/** Creates the environment, or updates it when an `id` is given. */
export function useSaveEnvironment(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: EnvironmentInput }) =>
      id ? updateEnvironment(id, input) : createEnvironment(input),
    // Rules show environment codes, so the whole project is reloaded
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) }),
  });
}

export function useDeleteEnvironment(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteEnvironment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) }),
  });
}
