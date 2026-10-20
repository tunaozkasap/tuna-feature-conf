// @vitest-environment node
/**
 * The committed API types (schema.d.ts) must be what openapi-typescript makes of the running backend's spec. When this
 * fails, a DTO changed in Java: regenerate the types and let `tsc` show what in the UI no longer fits.
 *
 * Runs in Node, not jsdom: openapi-typescript needs Node's own URL class.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';
import { expect, inject, test } from 'vitest';

const COMMITTED = fileURLToPath(new URL('./schema.d.ts', import.meta.url));

/**
 * Same line endings everywhere, and without the leading comment: `npm run generate-api` (the CLI) puts a header
 * comment in front of what the library returns, so only the generated types themselves are compared.
 */
function normalise(source: string): string {
  return source
    .replace(/\r\n/g, '\n')
    .replace(/^\s*\/\*\*[\s\S]*?\*\/\s*/, '')
    .trimEnd();
}

test('schema.d.ts matches the OpenAPI spec of the backend', { timeout: 60_000 }, async () => {
  const response = await fetch(`${inject('apiBaseUrl')}/api-docs`);
  expect(response.ok).toBe(true);
  const spec = await response.json();

  const generated = COMMENT_HEADER + astToString(await openapiTS(spec, { silent: true }));
  const committed = fs.readFileSync(COMMITTED, 'utf8');

  expect(
    normalise(committed),
    'src/api/schema.d.ts is out of date with the backend: start the service and run `npm run generate-api` in ui/',
  ).toBe(normalise(generated));
});
