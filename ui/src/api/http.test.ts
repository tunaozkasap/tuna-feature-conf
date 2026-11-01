/** The HTTP client against the real backend that test/globalSetup.ts started. */
import net from 'node:net';
import { describe, expect, inject, test } from 'vitest';
import { waitForEvidence } from '../../test/evidence';
import { createTestProject } from '../../test/testData';
import { ApiError, apiRequest, inProject, newRequestId, searchAll, setApiBaseUrl } from './http';
import type { Project } from './types';

/** Runs `call` and returns the `ApiError` it must throw. */
async function apiErrorOf(call: () => Promise<unknown>): Promise<ApiError> {
  try {
    await call();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error('Expected the call to fail with an ApiError');
}

/** A port nothing listens on: the OS hands out a free one, and it is closed again right away. */
function closedPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
    });
  });
}

describe('newRequestId', () => {
  test("starts with the test's prefix and fits what the backend accepts", () => {
    const id = newRequestId();
    expect(id).toMatch(/^ui-[A-Za-z0-9._-]+$/);
    expect(id.length).toBeLessThanOrEqual(64);
    expect(newRequestId()).not.toBe(id);
  });
});

describe('apiRequest', () => {
  test('returns the backend JSON as is, and the backend keeps the request id we sent', async () => {
    const project = await createTestProject();
    const requestId = newRequestId();
    const response = await apiRequest<{ success: boolean; data: Project }>('GET', `/api/projects/${project.id}`, undefined, {
      requestId,
    });
    expect(response.success).toBe(true);
    expect(response.data).toMatchObject({ id: project.id, name: project.name });
    expect(await waitForEvidence(requestId)).toMatchObject({ method: 'GET', path: `/api/projects/${project.id}`, status: 200 });
  });

  test('a validation failure gives the backend message, our request id and the field errors', async () => {
    const project = await createTestProject();
    const requestId = newRequestId();

    const error = await apiErrorOf(() =>
      apiRequest('POST', '/api/features', { data: { code: '', name: '', projectId: project.id } }, { requestId }),
    );

    expect(error.status).toBe(400);
    expect(error.message).toMatch(/^Some fields are missing or invalid: /);
    expect(error.message).toBe(error.body?.message);
    expect(error.requestId).toBe(requestId);
    expect(error.body?.requestId).toBe(requestId);
    expect(error.fieldErrors()).toEqual({ code: 'Feature code is required', name: 'Feature name is required' });
  });

  test('a missing resource gives a 404 with the backend message and our request id', async () => {
    const requestId = newRequestId();

    const error = await apiErrorOf(() => apiRequest('GET', `/api/projects/${Number.MAX_SAFE_INTEGER}`, undefined, { requestId }));

    expect(error.status).toBe(404);
    expect(error.requestId).toBe(requestId);
    expect(error.message).toBe(error.body?.message);
    expect(error.message).not.toBe('');
    expect(error.fieldErrors()).toEqual({});
  });

  test('an unreachable service gives status 0, a message to show and the request id we tried with', async () => {
    const requestId = newRequestId();
    setApiBaseUrl(`http://localhost:${await closedPort()}`);
    try {
      const error = await apiErrorOf(() => apiRequest('GET', '/api/projects', undefined, { requestId }));

      expect(error.status).toBe(0);
      expect(error.message).toBe('The service cannot be reached. Is it running?');
      expect(error.requestId).toBe(requestId);
    } finally {
      setApiBaseUrl(inject('apiBaseUrl'));
    }
  });
});

describe('searchAll', () => {
  test('returns the matching rows of a search endpoint', async () => {
    const project = await createTestProject();

    // inProject builds an EQUALS filter on any field; here: the project's own id
    const rows = await searchAll<Project>('/api/projects/search', [inProject(project.id, 'id')]);

    expect(rows).toEqual([expect.objectContaining({ id: project.id, name: project.name })]);
  });
});
