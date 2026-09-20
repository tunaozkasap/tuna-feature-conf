import { apiClient } from './apiClient';
import {
  CrudRequest,
  CrudResponse,
  FeatureRuleDto,
  FeatureRuleCreateRequest,
  FeatureRuleUpdateRequest,
} from '../types/api';

export const ruleService = {
  async getAll(params?: { featureId?: number; projectId?: number }): Promise<FeatureRuleDto[]> {
    const response = await apiClient.get<CrudResponse<FeatureRuleDto>>('/rules', params);
    return response.items || [];
  },

  async getById(id: number): Promise<FeatureRuleDto | null> {
    const response = await apiClient.get<CrudResponse<FeatureRuleDto>>(`/rules/${id}`);
    return response.data || null;
  },

  async create(data: FeatureRuleCreateRequest): Promise<FeatureRuleDto> {
    const payload: CrudRequest<FeatureRuleCreateRequest> = { data };
    const response = await apiClient.post<CrudResponse<FeatureRuleDto>>('/rules', payload);
    return response.data!;
  },

  async update(id: number, data: FeatureRuleUpdateRequest): Promise<FeatureRuleDto> {
    const payload: CrudRequest<FeatureRuleUpdateRequest> = { data };
    const response = await apiClient.put<CrudResponse<FeatureRuleDto>>(`/rules/${id}`, payload);
    return response.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.del<CrudResponse<void>>(`/rules/${id}`);
  },

  async search(request: CrudRequest<any> = {}): Promise<CrudResponse<FeatureRuleDto>> {
    return apiClient.post<CrudResponse<FeatureRuleDto>>('/rules/search', request);
  },
};
