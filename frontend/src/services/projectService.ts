import { apiClient } from './apiClient';
import {
  CrudRequest,
  CrudResponse,
  ProjectDto,
  ProjectCreateRequest,
  ProjectUpdateRequest,
} from '../types/api';

export const projectService = {
  async getAll(): Promise<ProjectDto[]> {
    const response = await apiClient.get<CrudResponse<ProjectDto>>('/projects');
    return response.items || [];
  },

  async getById(id: number): Promise<ProjectDto | null> {
    const response = await apiClient.get<CrudResponse<ProjectDto>>(`/projects/${id}`);
    return response.data || null;
  },

  async create(data: ProjectCreateRequest): Promise<ProjectDto> {
    const payload: CrudRequest<ProjectCreateRequest> = { data };
    const response = await apiClient.post<CrudResponse<ProjectDto>>('/projects', payload);
    return response.data!;
  },

  async update(id: number, data: ProjectUpdateRequest): Promise<ProjectDto> {
    const payload: CrudRequest<ProjectUpdateRequest> = { data };
    const response = await apiClient.put<CrudResponse<ProjectDto>>(`/projects/${id}`, payload);
    return response.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.del<CrudResponse<void>>(`/projects/${id}`);
  },

  async search(request: CrudRequest<any> = {}): Promise<CrudResponse<ProjectDto>> {
    return apiClient.post<CrudResponse<ProjectDto>>('/projects/search', request);
  },
};
