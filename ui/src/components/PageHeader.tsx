/**
 * The title row of every page: an optional trail of links above it (Projects › Shop › Features), the title, a
 * sentence explaining the page, and the page's buttons on the right.
 */
import type { ReactNode } from 'react';
import { Anchor, Breadcrumbs, Group, Stack, Text, Title } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

/** One step of the trail. Without `to` it is the current page, shown as plain text. */
export interface Crumb {
  label: ReactNode;
  to?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <Stack gap="xs" mb="xl">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs separator={<IconChevronRight size={14} color="var(--app-subtle-text)" />} separatorMargin={6}>
          {breadcrumbs.map((crumb, index) =>
            // The index is a fine key here: the trail is fixed for a page and never reordered
            crumb.to ? (
              <Anchor key={index} component={Link} to={crumb.to} size="sm" c="dimmed">
                {crumb.label}
              </Anchor>
            ) : (
              <Text key={index} size="sm" fw={500}>
                {crumb.label}
              </Text>
            ),
          )}
        </Breadcrumbs>
      )}
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="lg">
        <Stack gap={6}>
          <Title order={2} fz={28} style={{ letterSpacing: '-0.02em' }}>
            {title}
          </Title>
          {description && (
            <Text c="dimmed" size="sm" maw={760}>
              {description}
            </Text>
          )}
        </Stack>
        {actions && (
          <Group gap="sm" wrap="nowrap">
            {actions}
          </Group>
        )}
      </Group>
    </Stack>
  );
}
