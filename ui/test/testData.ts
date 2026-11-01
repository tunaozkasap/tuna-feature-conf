/**
 * Test data through the real API. Every helper makes unique names and codes, because all test files share one
 * backend (and its demo data). Query only what a test created, e.g. by the id of its own project.
 *
 * Kept apart from render.tsx so tests that don't render a screen don't load the whole app.
 */
import { createEnvironment } from '../src/api/environments';
import { createFeature } from '../src/api/features';
import { createProject } from '../src/api/projects';
import { createQualifier } from '../src/api/qualifiers';
import { createRule } from '../src/api/rules';
import type {
  Environment,
  EnvironmentInput,
  Feature,
  FeatureInput,
  Project,
  ProjectInput,
  Qualifier,
  QualifierInput,
  QualifierValueType,
  Rule,
  RuleInput,
} from '../src/api/types';

// ---- Unique names ------------------------------------------------------------------------------------------------

/** Eight random lower-case letters and digits. */
export function uniqueSuffix(): string {
  return (Math.random().toString(36).slice(2, 10) + '00000000').slice(0, 8);
}

/** `ui-<suffix>`, for names. */
export function uniqueName(prefix = 'ui'): string {
  return `${prefix}-${uniqueSuffix()}`;
}

/** `UI_<SUFFIX>`, for codes (the backend stores codes in upper case anyway). */
export function uniqueCode(prefix = 'UI'): string {
  return `${prefix}_${uniqueSuffix()}`.toUpperCase();
}

// ---- Test data through the real API ------------------------------------------------------------------------------

export function createTestProject(overrides: Partial<ProjectInput> = {}): Promise<Project> {
  return createProject({ name: uniqueName('ui-project'), description: 'Created by a UI test', ...overrides });
}

export function createTestEnvironment(projectId: number, overrides: Partial<EnvironmentInput> = {}): Promise<Environment> {
  const code = overrides.code ?? uniqueCode('ENV');
  return createEnvironment({ code, name: `Environment ${code}`, projectId, ...overrides });
}

export function createTestQualifier(
  projectId: number,
  valueType: QualifierValueType = 'TEXT',
  overrides: Partial<QualifierInput> = {},
): Promise<Qualifier> {
  const code = overrides.code ?? uniqueCode('QUAL');
  return createQualifier({ code, name: `Qualifier ${code}`, valueType, priority: 0, projectId, ...overrides });
}

export function createTestFeature(projectId: number, overrides: Partial<FeatureInput> = {}): Promise<Feature> {
  const code = overrides.code ?? uniqueCode('FEAT');
  return createFeature({ code, name: `Feature ${code}`, projectId, ...overrides });
}

/** An enabled rule; the ids are required, the values default to `qualifierValue: 'match-me'`, `featureValue: 'on'`. */
export function createTestRule(
  input: Pick<RuleInput, 'featureId' | 'environmentId' | 'qualifierId'> & Partial<RuleInput>,
): Promise<Rule> {
  return createRule({ qualifierValue: 'match-me', featureValue: 'on', priority: 0, enabled: true, ...input });
}

/** A project with one environment, one TEXT qualifier and one feature: what most rule and evaluation tests need. */
export interface TestSetup {
  project: Project;
  environment: Environment;
  qualifier: Qualifier;
  feature: Feature;
}

export async function createTestSetup(valueType: QualifierValueType = 'TEXT'): Promise<TestSetup> {
  const project = await createTestProject();
  const [environment, qualifier, feature] = await Promise.all([
    createTestEnvironment(project.id),
    createTestQualifier(project.id, valueType),
    createTestFeature(project.id),
  ]);
  return { project, environment, qualifier, feature };
}
