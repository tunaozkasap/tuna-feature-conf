import { apiClient } from './apiClient';
import {
  CrudRequest,
  CrudResponse,
  FeatureQualifierDto,
  FeatureQualifierCreateRequest,
  FeatureQualifierUpdateRequest,
} from '../types/api';

export const qualifierService = {
  async getAll(projectId?: number): Promise<FeatureQualifierDto[]> {
    const params = projectId !== undefined ? { projectId } : undefined;
    const response = await apiClient.get<CrudResponse<FeatureQualifierDto>>('/qualifiers', params);
    return response.items || [];
  },

  async getById(id: number): Promise<FeatureQualifierDto | null> {
    const response = await apiClient.get<CrudResponse<FeatureQualifierDto>>(`/qualifiers/${id}`);
    return response.data || null;
  },

  async create(data: FeatureQualifierCreateRequest): Promise<FeatureQualifierDto> {
    const payload: CrudRequest<FeatureQualifierCreateRequest> = { data };
    const response = await apiClient.post<CrudResponse<FeatureQualifierDto>>('/qualifiers', payload);
    return response.data!;
  },

  async update(id: number, data: FeatureQualifierUpdateRequest): Promise<FeatureQualifierDto> {
    const payload: CrudRequest<FeatureQualifierUpdateRequest> = { data };
    const response = await apiClient.put<CrudResponse<FeatureQualifierDto>>(`/qualifiers/${id}`, payload);
    return response.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.del<CrudResponse<void>>(`/qualifiers/${id}`);
  },

  async search(request: CrudRequest<any> = {}): Promise<CrudResponse<FeatureQualifierDto>> {
    return apiClient.post<CrudResponse<FeatureQualifierDto>>('/qualifiers/search', request);
  },
};
