import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('./src', import.meta.url));
const distDir = fileURLToPath(new URL('./dist', import.meta.url));

export default defineConfig(() => {
  const target = process.env.AUDIOSERVER_URL ?? 'http://localhost:7090';

  return {
    root: rootDir,
    base: '/player/',
    publicDir: 'public',
    plugins: [react()],
    build: {
      outDir: distDir,
      emptyOutDir: true,
      target: 'es2018',
    },
    server: {
      host: true,
      proxy: {
        '/audio': {
          target,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
