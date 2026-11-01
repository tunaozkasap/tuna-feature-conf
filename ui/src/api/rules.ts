/**
 * Rules of a project: "in environment E, when qualifier Q has value V, the feature's value is X".
 * Same layout as projects.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, inProject, searchAll } from './http';
import { queryKeys } from './queryKeys';
import type { Rule, RuleInput, RuleResponse } from './types';

// ---- API calls ---------------------------------------------------------------------------------------------------

/** Every rule of every feature in the project. Screens narrow it down (by feature, environment, ...) themselves. */
export function fetchRules(projectId: number): Promise<Rule[]> {
  return searchAll<Rule>('/api/rules/search', [inProject(projectId, 'feature.project.id')], [{ field: 'id', direction: 'ASC' }]);
}

export async function createRule(input: RuleInput): Promise<Rule> {
  const response = await apiRequest<RuleResponse>('POST', '/api/rules', { data: input });
  return response.data as Rule;
}

/**
 * Sends every field. Note: the backend ignores empty fields on update, so a start or end date that is cleared in the
 * form keeps its old value.
 */
export async function updateRule(id: number, input: RuleInput): Promise<Rule> {
  const response = await apiRequest<RuleResponse>('PUT', `/api/rules/${id}`, { data: input });
  return response.data as Rule;
}

/** Switches a rule on or off without touching anything else. */
export async function setRuleEnabled(id: number, enabled: boolean): Promise<Rule> {
  const response = await apiRequest<RuleResponse>('PUT', `/api/rules/${id}`, { data: { enabled } });
  return response.data as Rule;
}

export async function deleteRule(id: number): Promise<void> {
  await apiRequest('DELETE', `/api/rules/${id}`);
}

// ---- Hooks for the screens ---------------------------------------------------------------------------------------

export function useRules(projectId: number) {
  return useQuery({ queryKey: queryKeys.rules(projectId), queryFn: () => fetchRules(projectId) });
}

/** Creates the rule, or updates it when an `id` is given. */
export function useSaveRule(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: RuleInput }) => (id ? updateRule(id, input) : createRule(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.rules(projectId) }),
  });
}

export function useSetRuleEnabled(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => setRuleEnabled(id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.rules(projectId) }),
  });
}

export function useDeleteRule(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.rules(projectId) }),
  });
}
