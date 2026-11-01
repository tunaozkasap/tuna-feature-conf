/**
 * What a page shows while its data loads, when loading failed, and when there is nothing to show yet.
 *
 * Pages use them like this:
 *   if (features.isPending) return <Loading />;
 *   if (features.isError) return <ErrorAlert error={features.error} />;
 */
import type { ReactNode } from 'react';
import { Alert, Center, Code, Loader, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconInbox } from '@tabler/icons-react';
import { describeError } from './notify';

export function Loading() {
  return (
    <Center py={60}>
      <Loader aria-label="Loading" type="dots" size="lg" />
    </Center>
  );
}

/** The backend's message and request id, for an error that stops the whole page. */
export function ErrorAlert({ error }: { error: unknown }) {
  const { message, requestId } = describeError(error);
  return (
    <Alert color="red" variant="light" title="Could not load the data" icon={<IconAlertTriangle />}>
      <Text>{message}</Text>
      {requestId && (
        <Text size="sm" mt="xs">
          Request id: <Code>{requestId}</Code>
        </Text>
      )}
    </Alert>
  );
}

/** "Nothing here yet", with an optional icon and a button to create the first item. */
export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <Center py={48}>
      <Stack align="center" gap="xs">
        <ThemeIcon size={56} radius="xl" variant="light" color="brand">
          {icon ?? <IconInbox size={28} stroke={1.5} />}
        </ThemeIcon>
        <Text fw={600} mt="xs">
          {title}
        </Text>
        {description && (
          <Text c="dimmed" size="sm" ta="center" maw={440}>
            {description}
          </Text>
        )}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </Stack>
    </Center>
  );
}
