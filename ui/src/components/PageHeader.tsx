import type { ReactNode } from 'react';
import { Group, Stack, Text, Title } from '@mantine/core';

/** The title row of every page: title, a sentence explaining the page, and the page's buttons on the right. */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-start" mb="lg" wrap="nowrap">
      <Stack gap={4}>
        <Title order={2}>{title}</Title>
        {description && (
          <Text c="dimmed" size="sm" maw={720}>
            {description}
          </Text>
        )}
      </Stack>
      {actions && <Group gap="sm">{actions}</Group>}
    </Group>
  );
}
