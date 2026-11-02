/** The evaluation endpoint: "what value does this feature have for this request?" */
import { useMutation } from '@tanstack/react-query';
import { apiRequest, newRequestId } from './http';
import type { EvaluationInput, EvaluationResponse, EvaluationResult } from './types';

/** The backend's answer plus the request id it ran under, to look up its evidence line. */
export interface Evaluation {
  result: EvaluationResult;
  requestId: string;
}

export async function evaluateFeature(input: EvaluationInput): Promise<Evaluation> {
  const requestId = newRequestId();
  const response = await apiRequest<EvaluationResponse>('POST', '/api/evaluations/evaluate', { data: input }, { requestId });
  return { result: response.data ?? {}, requestId };
}

/** A mutation, not a query: an evaluation runs when the user presses the button, it isn't data to cache. */
export function useEvaluateFeature() {
  return useMutation({ mutationFn: evaluateFeature });
}

/** One environment's answer in a comparison (see `useEvaluateInAllEnvironments`). */
export interface EnvironmentEvaluation {
  environmentCode: string;
  evaluation: Evaluation;
}

/**
 * The same request once per environment, to compare: "on in DEV, off in PROD". Sends the requests at the same time
 * and gives the answers in the order of `environmentCodes`.
 */
export async function evaluateInEnvironments(input: EvaluationInput, environmentCodes: string[]): Promise<EnvironmentEvaluation[]> {
  const calls: Promise<Evaluation>[] = [];
  for (const environmentCode of environmentCodes) {
    calls.push(evaluateFeature({ ...input, environmentCode }));
  }
  const evaluations = await Promise.all(calls);
  const results: EnvironmentEvaluation[] = [];
  for (let i = 0; i < environmentCodes.length; i++) {
    results.push({ environmentCode: environmentCodes[i], evaluation: evaluations[i] });
  }
  return results;
}

export function useEvaluateInAllEnvironments() {
  return useMutation({
    mutationFn: ({ input, environmentCodes }: { input: EvaluationInput; environmentCodes: string[] }) =>
      evaluateInEnvironments(input, environmentCodes),
  });
}
