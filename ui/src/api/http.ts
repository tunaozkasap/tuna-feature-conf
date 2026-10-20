/**
 * The one place that talks HTTP to the backend. Every other API file calls `apiRequest` or `searchAll`.
 *
 * Every call:
 *  - sends its own `X-Request-Id`, so the backend's evidence line for that call can be found (see CLAUDE.md,
 *    "Debugging with execution evidence"),
 *  - wraps nothing and unwraps nothing: the caller sends `{ data: ... }` and gets the backend's JSON back as is,
 *  - throws an `ApiError` for any answer that isn't 2xx. It carries the backend's error body: the `message` to show
 *    the user and the `requestId` to look the failure up.
 */
import type { ErrorBody, Filter, Sort } from './types';

// ---- Configuration -----------------------------------------------------------------------------------------------

/** Empty: same server as the UI (the service jar, or Vite's dev proxy). Tests point it at their own backend. */
let baseUrl = '';

/** Start of every request id; tests set their own so their evidence lines are easy to find. */
let requestIdPrefix = 'ui';

export function setApiBaseUrl(url: string): void {
  baseUrl = url;
}

export function setRequestIdPrefix(prefix: string): void {
  requestIdPrefix = prefix;
}

/** A new id such as `ui-lz4k2a-8f3k1q`. The backend accepts `[A-Za-z0-9._-]{1,64}`. */
export function newRequestId(): string {
  const unique = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  return (requestIdPrefix + '-' + unique).slice(-64);
}

// ---- Errors ------------------------------------------------------------------------------------------------------

/** A failed API call. `message` is the backend's customer message, ready to show. */
export class ApiError extends Error {
  readonly status: number;
  readonly requestId: string;
  readonly body: ErrorBody | null;

  constructor(status: number, requestId: string, body: ErrorBody | null) {
    super(body?.message ?? `The server answered with status ${status}.`);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = body?.requestId ?? requestId;
    this.body = body;
  }

  /**
   * Field errors from a validation failure, e.g. `{ code: 'NotBlank' }`. The backend sends them as
   * `context.fieldErrors` with names like `data.code`; empty when it sent none (or hides technical details).
   */
  fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    const fieldErrors = (this.body?.context as { fieldErrors?: Record<string, { message?: string; constraint?: string }> } | undefined)
      ?.fieldErrors;
    if (!fieldErrors) {
      return errors;
    }
    for (const [name, detail] of Object.entries(fieldErrors)) {
      const field = name.startsWith('data.') ? name.slice('data.'.length) : name;
      errors[field] = detail.message ?? detail.constraint ?? 'Invalid value';
    }
    return errors;
  }
}

// ---- Requests ----------------------------------------------------------------------------------------------------

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions {
  /** Use this request id instead of a new one, e.g. to show it next to a result. */
  requestId?: string;
}

/** Sends one request and returns the parsed JSON answer (or throws an `ApiError`). */
export async function apiRequest<T>(method: HttpMethod, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  const requestId = options.requestId ?? newRequestId();
  const headers: Record<string, string> = { 'X-Request-Id': requestId, Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(baseUrl + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // No answer at all: the service is down or unreachable
    throw new ApiError(0, requestId, {
      message: 'The service cannot be reached. Is it running?',
      requestId,
    });
  }

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(response.status, response.headers.get('X-Request-Id') ?? requestId, json as ErrorBody | null);
  }
  return json as T;
}

/** More than any project has; the screens show whole lists and filter them in the browser. */
const ALL_ROWS = 1000;

/** Every row of a `/search` endpoint that matches the filters, in the given order. */
export async function searchAll<T>(path: string, filters: Filter[], sorts: Sort[] = []): Promise<T[]> {
  const response = await apiRequest<{ items?: T[] }>('POST', path, {
    filters,
    sorts,
    page: { pageNumber: 0, pageSize: ALL_ROWS },
  });
  return response.items ?? [];
}

/** The filter "belongs to this project", the most common one. */
export function inProject(projectId: number, field = 'project.id'): Filter {
  // FilterVo.value is a Java Object, which the generated types can't describe; any JSON value is accepted
  return { field, operator: 'EQUALS', value: projectId as unknown as Filter['value'] };
}
