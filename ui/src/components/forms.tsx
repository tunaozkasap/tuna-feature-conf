/** Pieces every form uses. */
import { Button, Group } from '@mantine/core';
import { ApiError } from '../api/http';

/**
 * The backend's validation messages by form field, e.g. `{ code: 'Feature code is required' }`, to show next to the
 * fields after a failed save. Empty for other errors (those appear as a notification anyway).
 */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  return error instanceof ApiError ? error.fieldErrors() : {};
}

/** Cancel and Save at the bottom right of a form. */
export function FormButtons({ saving, onCancel, saveLabel = 'Save' }: { saving: boolean; onCancel: () => void; saveLabel?: string }) {
  return (
    <Group justify="flex-end" mt="lg">
      <Button variant="default" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" loading={saving}>
        {saveLabel}
      </Button>
    </Group>
  );
}

/** "Required" check for text fields; Mantine forms call it with the field's value. */
export function required(label: string) {
  return (value: string) => (value.trim() ? null : `${label} is required`);
}

/** Codes are stored upper case without spaces (the backend upper-cases them); show the user what will be saved. */
export function toCode(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '_');
}
