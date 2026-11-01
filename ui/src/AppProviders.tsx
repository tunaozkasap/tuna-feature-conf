/**
 * The "providers" every screen relies on. main.tsx wraps the app in them, and tests wrap the screen they render in
 * them too, so a screen behaves the same in both.
 *  - MantineProvider: the component library's theme (colours, fonts, spacing),
 *  - Notifications: the pop-up messages in the corner (success, errors),
 *  - QueryClientProvider: the cache of data loaded from the API (TanStack Query, see api/queryKeys.ts).
 */
import type { ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from './theme';

export function AppProviders({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MantineProvider>
  );
}
