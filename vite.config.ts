import { defineConfig } from 'vite';
import { execSync } from 'child_process';

function buildVersion(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  try {
    const sha = execSync('git rev-parse --short=5 HEAD', { encoding: 'utf-8' }).trim();
    return `${date}.${sha}`;
  } catch {
    return date;
  }
}

export default defineConfig({
  base: '/SuYueReader/',
  define: {
    __BUILD_DATE__: JSON.stringify(buildVersion()),
  },
  server: {
    allowedHosts: ['lins-mbp-14.local'],
  },
});
