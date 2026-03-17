import { defineConfig } from 'vite';
import { execSync } from 'child_process';

function buildVersion(): string {
  const date = new Date().toISOString().slice(0, 10);
  const display = date.replace(/-/g, '.');
  try {
    const count = execSync(
      `git log --oneline --since="${date}T00:00:00" --until="${date}T23:59:59" | wc -l`,
      { encoding: 'utf-8' },
    ).trim();
    const n = parseInt(count, 10) || 1;
    return `${display}v${n}`;
  } catch {
    return `${display}v1`;
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
