import { apiClient } from './apiClient';
import {
  CrudRequest,
  CrudResponse,
  FeatureDto,
  FeatureCreateRequest,
  FeatureUpdateRequest,
} from '../types/api';

export const featureService = {
  async getAll(projectId?: number): Promise<FeatureDto[]> {
    const params = projectId !== undefined ? { projectId } : undefined;
    const response = await apiClient.get<CrudResponse<FeatureDto>>('/features', params);
    return response.items || [];
  },

  async getById(id: number): Promise<FeatureDto | null> {
    const response = await apiClient.get<CrudResponse<FeatureDto>>(`/features/${id}`);
    return response.data || null;
  },

  async create(data: FeatureCreateRequest): Promise<FeatureDto> {
    const payload: CrudRequest<FeatureCreateRequest> = { data };
    const response = await apiClient.post<CrudResponse<FeatureDto>>('/features', payload);
    return response.data!;
  },

  async update(id: number, data: FeatureUpdateRequest): Promise<FeatureDto> {
    const payload: CrudRequest<FeatureUpdateRequest> = { data };
    const response = await apiClient.put<CrudResponse<FeatureDto>>(`/features/${id}`, payload);
    return response.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.del<CrudResponse<void>>(`/features/${id}`);
  },

  async search(request: CrudRequest<any> = {}): Promise<CrudResponse<FeatureDto>> {
    return apiClient.post<CrudResponse<FeatureDto>>('/features/search', request);
  },
};
