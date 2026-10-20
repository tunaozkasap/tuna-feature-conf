/**
 * The API functions the screens use, as round trips against the real backend (create, list, update, delete).
 * Every test works in a project of its own, so lists are compared exactly; only the project list is shared.
 */
import { describe, expect, test } from 'vitest';
import { waitForEvidence } from '../../test/evidence';
import {
  createTestEnvironment,
  createTestFeature,
  createTestProject,
  createTestQualifier,
  createTestRule,
  createTestSetup,
  uniqueCode,
  uniqueName,
} from '../../test/testData';
import { createEnvironment, deleteEnvironment, fetchEnvironments, updateEnvironment } from './environments';
import { evaluateFeature } from './evaluation';
import { createFeature, deleteFeature, fetchFeatures, updateFeature } from './features';
import { ApiError } from './http';
import { createProject, deleteProject, fetchProjects, updateProject } from './projects';
import { createQualifier, deleteQualifier, fetchQualifiers, updateQualifier } from './qualifiers';
import { deleteRule, fetchRules, setRuleEnabled, updateRule } from './rules';

function ids(rows: { id: number }[]): number[] {
  return rows.map((row) => row.id);
}

describe('projects', () => {
  test('create, list, update and delete', async () => {
    const name = uniqueName();
    const created = await createProject({ name, description: 'first' });
    expect(created).toMatchObject({ name, description: 'first' });
    expect(created.id).toBeGreaterThan(0);
    expect(await fetchProjects()).toContainEqual(expect.objectContaining({ id: created.id, name }));

    const renamed = uniqueName();
    const updated = await updateProject(created.id, { name: renamed, description: 'second' });
    expect(updated).toMatchObject({ id: created.id, name: renamed, description: 'second' });

    await deleteProject(created.id);
    expect(ids(await fetchProjects())).not.toContain(created.id);
  });

  test('the list is sorted by name', async () => {
    const projects = await fetchProjects();
    const names = projects.map((project) => project.name);
    const sorted = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(names).toEqual(sorted);
  });
});

describe('environments', () => {
  test('create, list in creation order, update and delete', async () => {
    const project = await createTestProject();
    const first = await createEnvironment({ code: 'dev', name: 'Development', projectId: project.id });
    const second = await createTestEnvironment(project.id);
    expect(first).toMatchObject({ code: 'DEV', name: 'Development', projectId: project.id });

    expect(ids(await fetchEnvironments(project.id))).toEqual([first.id, second.id]);

    const updated = await updateEnvironment(first.id, { code: 'DEV', name: 'Dev box', projectId: project.id });
    expect(updated).toMatchObject({ id: first.id, code: 'DEV', name: 'Dev box' });

    await deleteEnvironment(first.id);
    expect(ids(await fetchEnvironments(project.id))).toEqual([second.id]);
  });
});

describe('qualifiers', () => {
  test('create, list by priority, update and delete', async () => {
    const project = await createTestProject();
    const low = await createQualifier({ code: 'country', name: 'Country', valueType: 'TEXT', priority: 1, projectId: project.id });
    const high = await createTestQualifier(project.id, 'NUMERIC', { priority: 50 });
    expect(low).toMatchObject({ code: 'COUNTRY', valueType: 'TEXT', priority: 1, projectId: project.id });
    expect(high).toMatchObject({ valueType: 'NUMERIC', priority: 50 });

    expect(ids(await fetchQualifiers(project.id))).toEqual([high.id, low.id]);

    const updated = await updateQualifier(low.id, { code: 'COUNTRY', name: 'Country', valueType: 'TEXT', priority: 99, projectId: project.id });
    expect(updated.priority).toBe(99);
    expect(ids(await fetchQualifiers(project.id))).toEqual([low.id, high.id]);

    await deleteQualifier(high.id);
    expect(ids(await fetchQualifiers(project.id))).toEqual([low.id]);
  });
});

describe('features', () => {
  test('create, list by code, update and delete', async () => {
    const project = await createTestProject();
    const zebra = await createFeature({ code: 'zebra_mode', name: 'Zebra', projectId: project.id });
    const alpha = await createTestFeature(project.id, { code: 'ALPHA_MODE' });
    expect(zebra).toMatchObject({ code: 'ZEBRA_MODE', name: 'Zebra', projectId: project.id });

    expect(ids(await fetchFeatures(project.id))).toEqual([alpha.id, zebra.id]);

    const updated = await updateFeature(zebra.id, { code: 'ZEBRA_MODE', name: 'Zebra stripes', description: 'new', projectId: project.id });
    expect(updated).toMatchObject({ id: zebra.id, name: 'Zebra stripes', description: 'new' });

    await deleteFeature(alpha.id);
    expect(ids(await fetchFeatures(project.id))).toEqual([zebra.id]);
  });

  test('a duplicate code in the same project is rejected with the backend message', async () => {
    const project = await createTestProject();
    const code = uniqueCode();
    await createTestFeature(project.id, { code });

    const failure = createTestFeature(project.id, { code });

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({
      status: 400,
      message: `A feature with code '${code}' already exists in this project.`,
    });
  });
});

describe('rules', () => {
  test('create, list, update, switch off and on, and delete', async () => {
    const { project, environment, qualifier, feature } = await createTestSetup();
    const rule = await createTestRule({
      featureId: feature.id,
      environmentId: environment.id,
      qualifierId: qualifier.id,
      qualifierValue: 'NL',
      featureValue: 'blue',
      priority: 3,
    });
    expect(rule).toMatchObject({
      featureId: feature.id,
      featureCode: feature.code,
      environmentId: environment.id,
      environmentCode: environment.code,
      qualifierId: qualifier.id,
      qualifierCode: qualifier.code,
      qualifierValue: 'NL',
      featureValue: 'blue',
      priority: 3,
      enabled: true,
    });
    expect(ids(await fetchRules(project.id))).toEqual([rule.id]);

    const updated = await updateRule(rule.id, {
      featureId: feature.id,
      environmentId: environment.id,
      qualifierId: qualifier.id,
      qualifierValue: 'DE',
      featureValue: 'green',
      priority: 7,
      enabled: true,
    });
    expect(updated).toMatchObject({ id: rule.id, qualifierValue: 'DE', featureValue: 'green', priority: 7 });

    const off = await setRuleEnabled(rule.id, false);
    expect(off).toMatchObject({ id: rule.id, enabled: false, qualifierValue: 'DE', featureValue: 'green', priority: 7 });
    expect(await setRuleEnabled(rule.id, true)).toMatchObject({ id: rule.id, enabled: true, featureValue: 'green' });

    await deleteRule(rule.id);
    expect(await fetchRules(project.id)).toEqual([]);
  });
});

describe('evaluateFeature', () => {
  test('a matching rule decides the value; otherwise the default applies', async () => {
    const { project, environment, qualifier, feature } = await createTestSetup();
    const rule = await createTestRule({
      featureId: feature.id,
      environmentId: environment.id,
      qualifierId: qualifier.id,
      qualifierValue: 'NL',
      featureValue: 'on',
    });
    const request = { featureCode: feature.code, projectId: project.id, environmentCode: environment.code };

    const match = await evaluateFeature({ ...request, requestContext: { [qualifier.code]: 'NL' } });
    expect(match.result).toMatchObject({
      featureCode: feature.code,
      environmentCode: environment.code,
      source: 'RULE_MATCH',
      resolvedValue: 'on',
      matchingRuleId: rule.id,
      matchingQualifierCode: qualifier.code,
    });

    const noMatch = await evaluateFeature({ ...request, requestContext: { [qualifier.code]: 'DE' } });
    expect(noMatch.result).toMatchObject({ source: 'DEFAULT_FALLBACK', resolvedValue: 'false' });
    expect(noMatch.result.matchingRuleId ?? null).toBeNull();
  });

  test('returns the request id it was sent under, so its evidence can be found', async () => {
    const { project, environment, qualifier, feature } = await createTestSetup();

    const evaluation = await evaluateFeature({
      featureCode: feature.code,
      projectId: project.id,
      environmentCode: environment.code,
      requestContext: { [qualifier.code]: 'anything' },
    });

    expect(evaluation.requestId).toMatch(/^ui-/);
    const evidence = await waitForEvidence(evaluation.requestId);
    expect(evidence).toMatchObject({
      path: '/api/evaluations/evaluate',
      status: 200,
      evaluation: { decision: { source: 'DEFAULT_FALLBACK' } },
    });
  });
});
