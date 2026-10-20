/**
 * What a page shows while its data loads, when loading failed, and when there is nothing to show yet.
 *
 * Pages use them like this:
 *   if (features.isPending) return <Loading />;
 *   if (features.isError) return <ErrorAlert error={features.error} />;
 */
import type { ReactNode } from 'react';
import { Alert, Center, Code, Loader, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconInbox } from '@tabler/icons-react';
import { describeError } from './notify';

export function Loading() {
  return (
    <Center py="xl">
      <Loader aria-label="Loading" />
    </Center>
  );
}

/** The backend's message and request id, for an error that stops the whole page. */
export function ErrorAlert({ error }: { error: unknown }) {
  const { message, requestId } = describeError(error);
  return (
    <Alert color="red" title="Could not load the data" icon={<IconAlertTriangle />}>
      <Text>{message}</Text>
      {requestId && (
        <Text size="sm" mt="xs">
          Request id: <Code>{requestId}</Code>
        </Text>
      )}
    </Alert>
  );
}

/** "Nothing here yet", with an optional button to create the first item. */
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Center py="xl">
      <Stack align="center" gap="xs">
        <IconInbox size={40} stroke={1.2} color="var(--mantine-color-gray-5)" />
        <Text fw={600}>{title}</Text>
        {description && (
          <Text c="dimmed" size="sm" ta="center" maw={420}>
            {description}
          </Text>
        )}
        {action}
      </Stack>
    </Center>
  );
}
