/** Pop-up messages in the top right corner. */
import { notifications } from '@mantine/notifications';
import { ApiError } from '../api/http';

export function showSuccess(message: string): void {
  notifications.show({ color: 'teal', title: 'Saved', message });
}

/**
 * Shows the backend's message and the request id. With the request id, the backend's evidence line for the failed
 * call can be found (CLAUDE.md, "Debugging with execution evidence").
 */
export function showApiError(error: unknown): void {
  const { message, requestId } = describeError(error);
  notifications.show({
    color: 'red',
    title: 'Something went wrong',
    message: requestId ? `${message} (request id: ${requestId})` : message,
    autoClose: 10000,
  });
}

/** The text to show for any error, and its request id when it came from the API. */
export function describeError(error: unknown): { message: string; requestId?: string } {
  if (error instanceof ApiError) {
    return { message: error.message, requestId: error.requestId };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: String(error) };
}
