import { MutationCache, QueryClient } from '@tanstack/react-query';
import { showApiError } from './components/notify';

/**
 * The data cache. Two app-wide choices:
 *  - a failed save (any "mutation") always shows an error notification with the backend's message and request id,
 *    so no screen can forget to,
 *  - failed loads are retried once, and data is reloaded when the browser tab gets focus again.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error) => showApiError(error),
    }),
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  });
}
