import { defineConfig } from '@playwright/test';
// HTTP-only checks own their disposable server; they do not start or reload Vite.
export default defineConfig({ testDir: '.', testMatch: ['outpost-server.spec.ts', 'outpost-live.spec.ts'], workers: 1, timeout: 60000, use: { trace: 'off' } });
