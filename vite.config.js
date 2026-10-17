import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveApiBase } from './src/services/api-url.js';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (mode === 'production') {
    if (env.VITE_API_URL?.trim()) resolveApiBase(env.VITE_API_URL, { production: true });
    else
      console.warn(
        '[Betelgeuse] VITE_API_URL is unset. UI will build, but API calls require the real Render HTTPS origin and a redeploy.',
      );
  }
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:4000', changeOrigin: true },
      },
    },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          // Eager module preload keeps the first render localized without inflating app code.
          manualChunks(id) {
            if (id.replaceAll('\\', '/').includes('/src/i18n/locales/')) return 'locales';
            if (/node_modules\/(?:react-i18next|i18next)\//.test(id.replaceAll('\\', '/'))) return 'i18n';
          },
        },
      },
    },
  };
});
