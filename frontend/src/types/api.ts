export type FilterOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'IN'
  | 'NOT_IN'
  | 'IS_NULL'
  | 'IS_NOT_NULL';

export type SortDirection = 'ASC' | 'DESC';

export interface FilterVo {
  field: string;
  operator: FilterOperator;
  value?: any;
}

export interface SortVo {
  field: string;
  direction?: SortDirection;
}

export interface PageVo {
  page?: number;
  size?: number;
}

export interface PageResponseVo {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface CrudRequest<T = any> {
  data?: T;
  page?: PageVo;
  sorts?: SortVo[];
  filters?: FilterVo[];
}

export interface CrudResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  items?: T[];
  page?: PageResponseVo;
  timestamp?: string;
}

// Backend DTOs
export interface ProjectDto {
  id: number;
  name: string;
  description?: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
}

export interface ProjectUpdateRequest {
  name: string;
  description?: string;
}

export interface FeatureDto {
  id: number;
  code: string;
  name: string;
  description?: string;
  projectId: number;
  projectName?: string;
  defaultValue?: string;
  enabled?: boolean;
}

export interface FeatureCreateRequest {
  code: string;
  name: string;
  description?: string;
  projectId: number;
}

export interface FeatureUpdateRequest {
  code?: string;
  name?: string;
  description?: string;
  projectId?: number;
}

export type FeatureQualifierValueType = 'NUMERIC' | 'BOOLEAN' | 'TEXT' | 'JSON';

export interface FeatureQualifierDto {
  id: number;
  code: string;
  name: string;
  description?: string;
  priority?: number;
  valueType: FeatureQualifierValueType;
  projectId: number;
  projectName?: string;
}

export interface FeatureQualifierCreateRequest {
  code: string;
  name: string;
  description?: string;
  priority?: number;
  valueType: FeatureQualifierValueType;
  projectId: number;
}

export interface FeatureQualifierUpdateRequest {
  code?: string;
  name?: string;
  description?: string;
  priority?: number;
  valueType?: FeatureQualifierValueType;
  projectId?: number;
}

export interface FeatureRuleDto {
  id: number;
  featureId: number;
  featureCode?: string;
  featureName?: string;
  qualifierId: number;
  qualifierCode?: string;
  qualifierName?: string;
  qualifierPriority?: number;
  qualifierValue: string;
  featureValue: string;
  priority?: number;
  enabled: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  description?: string;
}

export interface FeatureRuleCreateRequest {
  featureId: number;
  qualifierId: number;
  qualifierValue: string;
  featureValue: string;
  priority?: number;
  enabled?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  description?: string;
}

export interface FeatureRuleUpdateRequest {
  featureId?: number;
  qualifierId?: number;
  qualifierValue?: string;
  featureValue?: string;
  priority?: number;
  enabled?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  description?: string;
}

export interface EvaluationRequest {
  featureCode: string;
  projectId?: number;
  requestContext: Record<string, string>;
}

export interface EvaluationResponse {
  featureCode: string;
  featureName: string;
  resolvedValue: string;
  source: string;
  matchingRuleId?: number;
  matchingQualifierCode?: string;
  logs: string[];
}

export interface UserDto {
  id: number;
  username: string;
  email: string;
}

export interface UserCreateRequest {
  username: string;
  email: string;
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
}

export interface ProductDto {
  id: number;
  name: string;
  price: number;
}

export interface ProductCreateRequest {
  name: string;
  price: number;
}

export interface ProductUpdateRequest {
  name?: string;
  price?: number;
}
