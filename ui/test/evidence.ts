/**
 * Reads the test backend's evidence lines from ui/target/test-backend.log (see CLAUDE.md, "Debugging with execution
 * evidence"). The log mixes plain Spring lines with one JSON line per request,
 * `{"timestamp", "thread", "logger", "evidence": {...}}`; only the JSON ones are read.
 */
import fs from 'node:fs';
import { inject } from 'vitest';

/** One request's evidence. Only the fields tests usually look at are typed; everything else is there too. */
export interface Evidence {
  requestId?: string;
  status?: number;
  severity?: string;
  handler?: string;
  method?: string;
  path?: string;
  [field: string]: unknown;
}

/** Every evidence line written so far whose request id starts with `requestIdStart`, oldest first. */
export function evidenceStartingWith(requestIdStart: string): Evidence[] {
  const evidences: Evidence[] = [];
  for (const line of fs.readFileSync(inject('backendLogPath'), 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('{')) {
      continue;
    }
    const evidence = parseEvidence(line);
    if (evidence && typeof evidence.requestId === 'string' && evidence.requestId.startsWith(requestIdStart)) {
      evidences.push(evidence);
    }
  }
  return evidences;
}

/**
 * The evidence of one request. The backend writes it just after it answered, so this waits for it a little.
 * Throws when it doesn't appear.
 */
export async function waitForEvidence(requestId: string, timeoutMs = 3000): Promise<Evidence> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    for (const evidence of evidenceStartingWith(requestId)) {
      if (evidence.requestId === requestId) {
        return evidence;
      }
    }
    if (Date.now() > deadline) {
      throw new Error(`No evidence line for request id ${requestId} in ${inject('backendLogPath')}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function parseEvidence(line: string): Evidence | undefined {
  try {
    return (JSON.parse(line) as { evidence?: Evidence }).evidence;
  } catch {
    return undefined;
  }
}
