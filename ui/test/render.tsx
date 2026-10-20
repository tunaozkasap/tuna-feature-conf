/**
 * Renders a screen the way the app does, for component tests, plus a few helpers for Mantine's widgets. The test data
 * helpers (testData.ts) are re-exported here, so a component test needs one import.
 */
import { render, screen, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { notifications } from '@mantine/notifications';
import type { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../src/App';
import { AppProviders } from '../src/AppProviders';
import { createQueryClient } from '../src/queryClient';

export * from './testData';

export interface RenderedPage extends RenderResult {
  /** Clicks and typing, as a user would (`await user.click(...)`). */
  user: UserEvent;
  /** The page's own data cache, e.g. to wait until it is idle. */
  queryClient: QueryClient;
}

/** Renders the whole app at `path` (e.g. `/projects/3/features`), with a fresh data cache. */
export function renderPage(path: string): RenderedPage {
  // Mantine keeps notifications in a module-wide store; drop the ones an earlier test in this file left behind
  notifications.clean();
  const user = userEvent.setup();
  const queryClient = createQueryClient();
  const result = render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AppProviders>,
  );
  return { ...result, user, queryClient };
}

// ---- Mantine helpers ---------------------------------------------------------------------------------------------

/** Opens the Select labelled `label` and picks the option `option`. */
export async function chooseOption(user: UserEvent, label: string | RegExp, option: string | RegExp): Promise<void> {
  await user.click(screen.getByRole('textbox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

/** The table row that shows `text` (waits until it appears). */
export async function findRow(text: string | RegExp): Promise<HTMLElement> {
  const cell = await screen.findByText(text, { selector: 'td, td *' });
  const row = cell.closest('tr');
  if (!row) {
    throw new Error(`"${String(text)}" is not inside a table row`);
  }
  return row;
}

/**
 * Waits for the error notification "<message> (request id: <id>)" (see components/notify.ts) and returns the id.
 * `message` is the backend's message, exactly.
 */
export async function findNotifiedRequestId(message: string): Promise<string> {
  const start = `${message} (request id: `;
  const notification = await screen.findByText((text) => text.startsWith(start) && text.endsWith(')'));
  return (notification.textContent ?? '').slice(start.length, -1);
}
