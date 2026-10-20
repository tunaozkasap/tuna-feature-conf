import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { waitForEvidence } from '../../../test/evidence';
import { createTestEnvironment, createTestRule, createTestSetup, renderPage } from '../../../test/render';

/** The request id the result card shows ("Request id ui-...: the backend's evidence line ..."). */
function shownRequestId(): string {
  return screen.getByText(/^ui-[A-Za-z0-9._-]+$/, { selector: 'code' }).textContent ?? '';
}

/**
 * A project whose feature has one rule, in its second environment (so preselecting it through the address is visible):
 * when the qualifier is NL, the value is "on".
 */
async function createEvaluationSetup() {
  const setup = await createTestSetup();
  const second = await createTestEnvironment(setup.project.id);
  const rule = await createTestRule({
    featureId: setup.feature.id,
    environmentId: second.id,
    qualifierId: setup.qualifier.id,
    qualifierValue: 'NL',
    featureValue: 'on',
  });
  return { ...setup, environment: second, rule };
}

describe('EvaluatePage', () => {
  test('the address preselects feature and environment; a matching context gives the rule value, traceable by request id', async () => {
    const { project, environment, qualifier, feature, rule } = await createEvaluationSetup();
    const { user } = renderPage(
      `/projects/${project.id}/evaluate?feature=${encodeURIComponent(feature.code)}&environment=${encodeURIComponent(environment.code)}`,
    );

    expect(await screen.findByRole('textbox', { name: 'Feature' })).toHaveValue(`${feature.code} — ${feature.name}`);
    expect(screen.getByRole('textbox', { name: 'Environment' })).toHaveValue(`${environment.code} — ${environment.name}`);
    expect(screen.getByText('No result yet')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: `${qualifier.code} — ${qualifier.name}` }), 'NL');
    // The request preview shows exactly what is sent
    expect(screen.getByText(/"requestContext"/, { selector: 'pre' })).toHaveTextContent(`"${qualifier.code}": "NL"`);
    await user.click(screen.getByRole('button', { name: 'Evaluate' }));

    expect(await screen.findByText('Rule matched')).toBeInTheDocument();
    expect(screen.getByText('on', { selector: 'pre' })).toBeInTheDocument();
    expect(screen.getByText(`${feature.code} in ${environment.code} resolves to`)).toBeInTheDocument();
    expect(screen.getByText(`Decided by rule #${rule.id} on qualifier`, { exact: false })).toHaveTextContent(qualifier.code);

    const requestId = shownRequestId();
    expect(requestId).toMatch(/^ui-/);
    expect(await waitForEvidence(requestId)).toMatchObject({
      path: '/api/evaluations/evaluate',
      status: 200,
      evaluation: { decision: { source: 'RULE_MATCH' } },
    });
  });

  test('a context no rule matches gives the default value', async () => {
    const { project, environment, qualifier, feature } = await createEvaluationSetup();
    const { user } = renderPage(
      `/projects/${project.id}/evaluate?feature=${encodeURIComponent(feature.code)}&environment=${encodeURIComponent(environment.code)}`,
    );

    await user.type(await screen.findByRole('textbox', { name: `${qualifier.code} — ${qualifier.name}` }), 'DE');
    await user.click(screen.getByRole('button', { name: 'Evaluate' }));

    expect(await screen.findByText('Default value (no rule matched)')).toBeInTheDocument();
    expect(screen.getByText('false', { selector: 'pre' })).toBeInTheDocument();
    expect(screen.getByText('No active rule matched the request context, so the feature has its default value.')).toBeInTheDocument();
    expect(await waitForEvidence(shownRequestId())).toMatchObject({
      evaluation: { decision: { source: 'DEFAULT_FALLBACK' } },
    });
  });

  test('Evaluate stays disabled until a feature is chosen', async () => {
    const { project } = await createEvaluationSetup();

    renderPage(`/projects/${project.id}/evaluate`);

    expect(await screen.findByRole('button', { name: 'Evaluate' })).toBeDisabled();
  });
});
