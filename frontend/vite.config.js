import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/generate': {
        target: 'https://ilhamdev-quote-api.hf.space',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/api': {
        target: 'https://ilhamdev-quote-api.hf.space',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
