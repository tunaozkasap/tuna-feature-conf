import { apiClient } from './apiClient';
import {
  CrudRequest,
  CrudResponse,
  UserDto,
  UserCreateRequest,
  UserUpdateRequest,
} from '../types/api';

export const userService = {
  async getAll(): Promise<UserDto[]> {
    const response = await apiClient.get<CrudResponse<UserDto>>('/users');
    return response.items || [];
  },

  async getById(id: number): Promise<UserDto | null> {
    const response = await apiClient.get<CrudResponse<UserDto>>(`/users/${id}`);
    return response.data || null;
  },

  async create(data: UserCreateRequest): Promise<UserDto> {
    const payload: CrudRequest<UserCreateRequest> = { data };
    const response = await apiClient.post<CrudResponse<UserDto>>('/users', payload);
    return response.data!;
  },

  async update(id: number, data: UserUpdateRequest): Promise<UserDto> {
    const payload: CrudRequest<UserUpdateRequest> = { data };
    const response = await apiClient.put<CrudResponse<UserDto>>(`/users/${id}`, payload);
    return response.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.del<CrudResponse<void>>(`/users/${id}`);
  },

  async search(request: CrudRequest<any> = {}): Promise<CrudResponse<UserDto>> {
    return apiClient.post<CrudResponse<UserDto>>('/users/search', request);
  },
};
