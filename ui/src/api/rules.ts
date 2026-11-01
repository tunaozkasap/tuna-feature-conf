/**
 * Rules of a project: "in environment E, when qualifier Q has value V, the feature's value is X".
 * Same layout as projects.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, inProject, searchAll } from './http';
import { queryKeys } from './queryKeys';
import type { Rule, RuleInput, RuleResponse, RuleUpdateInput } from './types';

// ---- API calls ---------------------------------------------------------------------------------------------------

/** Every rule of every feature in the project. Screens narrow it down (by feature, environment, ...) themselves. */
export function fetchRules(projectId: number): Promise<Rule[]> {
  return searchAll<Rule>('/api/rules/search', [inProject(projectId, 'feature.project.id')], [{ field: 'id', direction: 'ASC' }]);
}

export async function createRule(input: RuleInput): Promise<Rule> {
  const response = await apiRequest<RuleResponse>('POST', '/api/rules', { data: input });
  return response.data as Rule;
}

/** Changes the given fields; fields left out stay as they are. */
export async function updateRule(id: number, input: RuleUpdateInput): Promise<Rule> {
  const response = await apiRequest<RuleResponse>('PUT', `/api/rules/${id}`, { data: input });
  return response.data as Rule;
}

/**
 * The update for a rule saved from the form, where every field is filled in as the user wants it. The backend leaves
 * empty fields unchanged, so a start or end date the user emptied has to be cleared explicitly.
 */
export function updateFromForm(input: RuleInput): RuleUpdateInput {
  return { ...input, clearEffectiveFrom: !input.effectiveFrom, clearEffectiveTo: !input.effectiveTo };
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

/** Creates the rule from the form, or updates it to match the form when an `id` is given. */
export function useSaveRule(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: RuleInput }) =>
      id ? updateRule(id, updateFromForm(input)) : createRule(input),
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
