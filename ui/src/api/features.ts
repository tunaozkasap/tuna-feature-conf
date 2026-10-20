/** Features of a project (NEW_CHECKOUT, DARK_MODE, ...). Same layout as projects.ts. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, inProject, searchAll } from './http';
import { queryKeys } from './queryKeys';
import type { Feature, FeatureInput, FeatureResponse } from './types';

// ---- API calls ---------------------------------------------------------------------------------------------------

export function fetchFeatures(projectId: number): Promise<Feature[]> {
  return searchAll<Feature>('/api/features/search', [inProject(projectId)], [{ field: 'code', direction: 'ASC' }]);
}

export async function createFeature(input: FeatureInput): Promise<Feature> {
  const response = await apiRequest<FeatureResponse>('POST', '/api/features', { data: input });
  return response.data as Feature;
}

export async function updateFeature(id: number, input: FeatureInput): Promise<Feature> {
  const response = await apiRequest<FeatureResponse>('PUT', `/api/features/${id}`, { data: input });
  return response.data as Feature;
}

export async function deleteFeature(id: number): Promise<void> {
  await apiRequest('DELETE', `/api/features/${id}`);
}

// ---- Hooks for the screens ---------------------------------------------------------------------------------------

/** The project's features, sorted by code. */
export function useFeatures(projectId: number) {
  return useQuery({ queryKey: queryKeys.features(projectId), queryFn: () => fetchFeatures(projectId) });
}

/** Creates the feature, or updates it when an `id` is given. */
export function useSaveFeature(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: FeatureInput }) =>
      id ? updateFeature(id, input) : createFeature(input),
    // Rules show feature codes, so the whole project is reloaded
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) }),
  });
}

export function useDeleteFeature(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFeature(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) }),
  });
}
