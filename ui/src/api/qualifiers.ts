/** Qualifiers of a project (COUNTRY, USER_ID, ...): what a rule can match on. Same layout as projects.ts. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, inProject, searchAll } from './http';
import { queryKeys } from './queryKeys';
import type { Qualifier, QualifierInput, QualifierResponse } from './types';

// ---- API calls ---------------------------------------------------------------------------------------------------

/** Highest priority first: the order in which the backend checks them. */
export function fetchQualifiers(projectId: number): Promise<Qualifier[]> {
  return searchAll<Qualifier>('/api/qualifiers/search', [inProject(projectId)], [
    { field: 'priority', direction: 'DESC' },
    { field: 'code', direction: 'ASC' },
  ]);
}

export async function createQualifier(input: QualifierInput): Promise<Qualifier> {
  const response = await apiRequest<QualifierResponse>('POST', '/api/qualifiers', { data: input });
  return response.data as Qualifier;
}

export async function updateQualifier(id: number, input: QualifierInput): Promise<Qualifier> {
  const response = await apiRequest<QualifierResponse>('PUT', `/api/qualifiers/${id}`, { data: input });
  return response.data as Qualifier;
}

export async function deleteQualifier(id: number): Promise<void> {
  await apiRequest('DELETE', `/api/qualifiers/${id}`);
}

// ---- Hooks for the screens ---------------------------------------------------------------------------------------

export function useQualifiers(projectId: number) {
  return useQuery({ queryKey: queryKeys.qualifiers(projectId), queryFn: () => fetchQualifiers(projectId) });
}

/** Creates the qualifier, or updates it when an `id` is given. */
export function useSaveQualifier(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: QualifierInput }) =>
      id ? updateQualifier(id, input) : createQualifier(input),
    // Rules show qualifier codes and priorities, so the whole project is reloaded
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) }),
  });
}

export function useDeleteQualifier(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteQualifier(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) }),
  });
}
