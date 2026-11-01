/**
 * The look of the app: colours, font, corner radius and the default props of Mantine's components.
 *
 * Mantine reads this once (AppProviders.tsx). The few things a theme can't express (surface colours per light/dark
 * scheme, the side menu, hover effects) are plain CSS in styles.css.
 */
import { createTheme, type MantineColorsTuple } from '@mantine/core';

/** The accent colour: a violet-indigo, 10 shades from lightest to darkest (Mantine uses shade 6 for buttons). */
const brand: MantineColorsTuple = [
  '#f0efff',
  '#dedcfd',
  '#bab5f6',
  '#948cf0',
  '#7468ea',
  '#5f52e7',
  '#5446e6',
  '#4538cd',
  '#3c31b8',
  '#3128a3',
];

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 5 },
  colors: { brand },
  fontFamily: "'Inter Variable', Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  headings: {
    fontFamily: "'Inter Variable', Inter, ui-sans-serif, system-ui, sans-serif",
    fontWeight: '650',
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
  shadows: {
    xs: '0 1px 2px rgba(16, 24, 40, 0.05)',
    sm: '0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)',
    md: '0 4px 12px rgba(16, 24, 40, 0.08), 0 2px 4px rgba(16, 24, 40, 0.04)',
  },

  // Defaults for every use of a component, so the pages don't repeat them
  components: {
    Card: { defaultProps: { withBorder: true, radius: 'lg', shadow: 'xs' } },
    Badge: { defaultProps: { radius: 'sm' }, styles: { root: { textTransform: 'none', fontWeight: 600 } } },
    Modal: { defaultProps: { centered: true, radius: 'lg', overlayProps: { backgroundOpacity: 0.4, blur: 3 } } },
    Tooltip: { defaultProps: { withArrow: true, openDelay: 150 } },
    Table: { defaultProps: { highlightOnHover: true, verticalSpacing: 'sm' } },
    Alert: { defaultProps: { radius: 'md' } },
  },
});
