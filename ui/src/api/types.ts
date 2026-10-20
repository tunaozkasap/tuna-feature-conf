/**
 * Friendly names for the API types.
 *
 * Everything here comes from `schema.d.ts`, which is GENERATED from the backend's OpenAPI spec
 * (`npm run generate-api` with the service running). Never edit `schema.d.ts` by hand: when a DTO changes in Java,
 * regenerate it, and `tsc` points at every place in the UI that no longer fits.
 *
 * The spec marks every field as optional. For fields the backend always fills (ids, codes, names) the aliases below
 * mark them as required, so the screens don't have to check them everywhere.
 */
import type { components } from './schema';

type Schemas = components['schemas'];

/** `T` with the listed fields required. */
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

// ---- What the API returns ----------------------------------------------------------------------------------------

export type Project = WithRequired<Schemas['ProjectResponse'], 'id' | 'name'>;
export type Environment = WithRequired<Schemas['EnvironmentResponse'], 'id' | 'code' | 'name' | 'projectId'>;
export type Qualifier = WithRequired<Schemas['FeatureQualifierResponse'], 'id' | 'code' | 'name' | 'valueType' | 'projectId'>;
export type Feature = WithRequired<Schemas['FeatureResponse'], 'id' | 'code' | 'name' | 'projectId'>;
export type Rule = WithRequired<
  Schemas['FeatureRuleResponse'],
  'id' | 'featureId' | 'featureCode' | 'environmentId' | 'environmentCode' | 'qualifierId' | 'qualifierCode'
  | 'qualifierValue' | 'featureValue'
>;
export type EvaluationResult = Schemas['EvaluationResponse'];

/** The body of every error response (see GlobalExceptionHandler in the service). */
export type ErrorBody = Schemas['ApiErrorResponse'];

// ---- What the API accepts ----------------------------------------------------------------------------------------

export type ProjectInput = Schemas['ProjectCreateRequest'];
export type EnvironmentInput = Schemas['EnvironmentCreateRequest'];
export type QualifierInput = Schemas['FeatureQualifierCreateRequest'];
export type FeatureInput = Schemas['FeatureCreateRequest'];
export type RuleInput = Schemas['FeatureRuleCreateRequest'];
export type EvaluationInput = Schemas['EvaluationRequest'];

/** TEXT, NUMERIC, BOOLEAN or JSON: what kind of value a qualifier holds. */
export type QualifierValueType = NonNullable<Schemas['FeatureQualifierResponse']['valueType']>;

/** One search filter, e.g. `{ field: 'project.id', operator: 'EQUALS', value: 3 }`. */
export type Filter = Schemas['FilterVo'];
export type Sort = Schemas['SortVo'];

// ---- Response envelopes (`{ success, data, items, page }`) --------------------------------------------------------

export type ProjectResponse = Schemas['CrudResponseProjectResponse'];
export type EnvironmentResponse = Schemas['CrudResponseEnvironmentResponse'];
export type QualifierResponse = Schemas['CrudResponseFeatureQualifierResponse'];
export type FeatureResponse = Schemas['CrudResponseFeatureResponse'];
export type RuleResponse = Schemas['CrudResponseFeatureRuleResponse'];
export type EvaluationResponse = Schemas['CrudResponseEvaluationResponse'];
