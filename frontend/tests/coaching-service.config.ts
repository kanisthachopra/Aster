import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '.', testMatch: ['coaching-service.spec.ts','coaching-live.spec.ts'], workers: 1, timeout: 40000, use: { trace: 'off' } });
