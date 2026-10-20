/**
 * Start of the UI: puts the app on the page.
 *  - AppProviders: theme, notifications and the API data cache (see AppProviders.tsx),
 *  - BrowserRouter: maps the address bar (/projects/1/features) to a screen, see App.tsx.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { App } from './App';
import { AppProviders } from './AppProviders';
import { createQueryClient } from './queryClient';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders queryClient={createQueryClient()}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProviders>
  </React.StrictMode>,
);
