import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: '/SuYueReader/',
  server: {
    allowedHosts: ['lins-mbp-14.local'],
  },
  plugins: [
    {
      name: 'exclude-dict-from-public',
      closeBundle() {
        // Remove dict files from build output — they're served from jsDelivr CDN in production
        const dictDir = path.resolve('dist', 'dict');
        if (fs.existsSync(dictDir)) {
          fs.rmSync(dictDir, { recursive: true });
        }
      },
    },
  ],
});
