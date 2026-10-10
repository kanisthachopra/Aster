import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { speechPlugin } from './server/speech.ts';
import { outpostPlugin } from './server/outpost.ts';

export default defineConfig(({ mode }) => {
  const prefixes = ['DEEPGRAM_', 'SUPABASE_', 'APP_ORIGIN', 'RECOVERY_', 'RESEND_', 'EMAIL_'];
  const env = { ...loadEnv('deployment', process.cwd(), prefixes), ...loadEnv(mode, process.cwd(), prefixes) };
  return {
  plugins: [react(), outpostPlugin(env), speechPlugin(env)],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { target: 'es2022' },
}; });
