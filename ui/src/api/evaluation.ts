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
