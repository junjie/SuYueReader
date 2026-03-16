import { defineConfig } from 'vite';

export default defineConfig({
  base: '/SuYueReader/',
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10).replace(/-/g, '.')),
  },
  server: {
    allowedHosts: ['lins-mbp-14.local'],
  },
});
