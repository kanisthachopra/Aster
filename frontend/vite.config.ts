import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { speechPlugin } from './server/speech';

export default defineConfig(({ mode }) => ({
  plugins: [react(), speechPlugin(loadEnv(mode, process.cwd(), 'DEEPGRAM_'))],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { target: 'es2022' },
}));
