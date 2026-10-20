import { describe, expect, test } from 'vitest';
import { formatDateTime, fromDateTimeInput, toDateTimeInput } from './dates';

// The results depend on the machine's time zone and language, so the tests check shapes and round trips.
const ISO = '2026-10-20T21:39:00.000Z';

describe('formatDateTime', () => {
  test('no date, no text', () => {
    expect(formatDateTime(undefined)).toBe('');
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime('')).toBe('');
  });

  test('shows the year and the local time to the minute', () => {
    const text = formatDateTime(ISO);
    const local = new Date(ISO);
    expect(text).toContain(String(local.getFullYear()));
    expect(text).toContain(String(local.getMinutes()).padStart(2, '0'));
    expect(text).not.toContain('Z');
  });
});

describe('toDateTimeInput', () => {
  test('no date, empty input', () => {
    expect(toDateTimeInput(undefined)).toBe('');
    expect(toDateTimeInput(null)).toBe('');
  });

  test('gives the text a datetime-local input holds, without seconds', () => {
    expect(toDateTimeInput('2026-10-20T21:39:43Z')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  test('pads single digits', () => {
    const text = toDateTimeInput(new Date(2026, 0, 2, 3, 4).toISOString());
    expect(text).toBe('2026-01-02T03:04');
  });
});

describe('fromDateTimeInput', () => {
  test('an empty input means no date', () => {
    expect(fromDateTimeInput('')).toBeUndefined();
  });

  test('reads the input as local time and gives a UTC instant', () => {
    expect(fromDateTimeInput('2026-01-02T03:04')).toBe(new Date(2026, 0, 2, 3, 4).toISOString());
  });

  test('round trips with toDateTimeInput (to the minute)', () => {
    expect(fromDateTimeInput(toDateTimeInput(ISO))).toBe(ISO);
    expect(fromDateTimeInput(toDateTimeInput('2026-10-20T21:39:43Z'))).toBe(ISO);
  });
});
