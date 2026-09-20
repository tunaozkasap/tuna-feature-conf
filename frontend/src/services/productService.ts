import { apiClient } from './apiClient';
import {
  CrudRequest,
  CrudResponse,
  ProductDto,
  ProductCreateRequest,
  ProductUpdateRequest,
} from '../types/api';

export const productService = {
  async getAll(): Promise<ProductDto[]> {
    const response = await apiClient.get<CrudResponse<ProductDto>>('/products');
    return response.items || [];
  },

  async getById(id: number): Promise<ProductDto | null> {
    const response = await apiClient.get<CrudResponse<ProductDto>>(`/products/${id}`);
    return response.data || null;
  },

  async create(data: ProductCreateRequest): Promise<ProductDto> {
    const payload: CrudRequest<ProductCreateRequest> = { data };
    const response = await apiClient.post<CrudResponse<ProductDto>>('/products', payload);
    return response.data!;
  },

  async update(id: number, data: ProductUpdateRequest): Promise<ProductDto> {
    const payload: CrudRequest<ProductUpdateRequest> = { data };
    const response = await apiClient.put<CrudResponse<ProductDto>>(`/products/${id}`, payload);
    return response.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.del<CrudResponse<void>>(`/products/${id}`);
  },

  async search(request: CrudRequest<any> = {}): Promise<CrudResponse<ProductDto>> {
    return apiClient.post<CrudResponse<ProductDto>>('/products/search', request);
  },
};
