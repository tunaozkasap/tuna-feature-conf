import { createTheme } from '@mantine/core';

/** Mantine theme: the few places where the app differs from Mantine's defaults. */
export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});
