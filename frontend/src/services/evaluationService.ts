import { apiClient } from './apiClient';
import {
  CrudRequest,
  CrudResponse,
  EvaluationRequest,
  EvaluationResponse,
} from '../types/api';

export const evaluationService = {
  async evaluateFeature(request: EvaluationRequest): Promise<EvaluationResponse> {
    const payload: CrudRequest<EvaluationRequest> = { data: request };
    const response = await apiClient.post<CrudResponse<EvaluationResponse>>(
      '/evaluations/evaluate',
      payload
    );
    return response.data!;
  },
};
