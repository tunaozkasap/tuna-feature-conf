/**
 * Dates. The API sends and expects ISO instants in UTC ("2026-10-20T21:39:43Z"); the screens show and edit them in
 * the browser's local time.
 */

/** "20 Oct 2026, 23:39" in the browser's language and time zone, or "" for no date. */
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) {
    return '';
  }
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ISO instant → the "2026-10-20T23:39" text an `<input type="datetime-local">` holds (local time). */
export function toDateTimeInput(iso: string | undefined | null): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The text of an `<input type="datetime-local">` → ISO instant, or `undefined` when the input is empty. */
export function fromDateTimeInput(value: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return new Date(value).toISOString();
}
