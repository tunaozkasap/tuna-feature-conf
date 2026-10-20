/**
 * Runs in every test worker before the test files (vite.config.ts, `setupFiles`).
 *
 *  - points the API client at the backend that test/globalSetup.ts started,
 *  - gives each test its own `X-Request-Id` prefix, and when a test fails prints that test's evidence lines from the
 *    backend's output, so the failure shows what the backend decided (CLAUDE.md, "Frontend testing"),
 *  - adds the browser APIs jsdom lacks and Mantine needs.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, inject, type TaskContext } from 'vitest';
import { setApiBaseUrl, setRequestIdPrefix } from '../src/api/http';
import { evidenceStartingWith } from './evidence';

setApiBaseUrl(inject('apiBaseUrl'));

// findBy* and waitFor wait for real API calls; with every test file running at once, 1 s (the default) is too short
configure({ asyncUtilTimeout: 5000 });

// ---- Request ids and evidence ------------------------------------------------------------------------------------

/** The backend writes a request's evidence line just after it answers; give it a moment before reading the log. */
const EVIDENCE_FLUSH_MS = 300;

beforeEach((context: TaskContext) => {
  const prefix = requestIdPrefix(context.task.name);
  setRequestIdPrefix(prefix);
  context.onTestFailed(() => printEvidence(prefix));
});

afterEach(() => {
  cleanup();
  setRequestIdPrefix('ui');
});

/**
 * `ui-<test name>-<4 random chars>`, e.g. `ui-creates-a-project-k3f9`. The random part keeps two tests with the same
 * name (in different files) apart. At most 40 characters, so a request id (prefix + 16, see `newRequestId`) stays
 * within the 64 the backend accepts.
 *
 * The prefix is one slot per worker: tests in one file share it, so `test.concurrent` tests that call the API would
 * mix their ids. Send an explicit `requestId` there, or keep those tests sequential.
 */
function requestIdPrefix(testName: string): string {
  const name = testName.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  const random = Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  return `ui-${name}-${random}`;
}

async function printEvidence(prefix: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, EVIDENCE_FLUSH_MS));
  const evidences = evidenceStartingWith(prefix + '-');
  const lines = [`Backend evidence for request ids ${prefix}-* (${evidences.length} line(s), from ${inject('backendLogPath')}):`];
  for (const evidence of evidences) {
    lines.push(JSON.stringify(evidence, null, 2));
  }
  console.error(lines.join('\n'));
}

// ---- Browser APIs jsdom doesn't have -----------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  // Mantine reads media queries (colour scheme, breakpoints)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // ScrollArea, Combobox (Select) and Popover measure elements
  class NoResizeObserver implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  window.ResizeObserver = NoResizeObserver;

  // Combobox scrolls the selected option into view; modals and drawers scroll the window
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.scrollTo = () => {};
  window.scrollTo = () => {};
}
