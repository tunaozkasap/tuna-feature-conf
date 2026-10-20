/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    // Straight into the jar's resources: Spring Boot serves META-INF/resources as static content
    outDir: 'target/classes/META-INF/resources',
    emptyOutDir: true,
  },

  // `npm run dev`: the UI on http://localhost:5173, API calls passed on to the service on port 8080
  // (or wherever API_URL points, e.g. API_URL=http://localhost:18080 npm run dev)
  server: {
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:8080',
    },
  },

  // Frontend tests: they run against a real service started by test/globalSetup.ts (no mocked API)
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    globalSetup: './test/globalSetup.ts',
    setupFiles: './test/setup.ts',
    testTimeout: 20000,
  },
});
