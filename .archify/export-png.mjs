import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = resolve(import.meta.dirname, '..');
const outDir = '/tmp/opencode/archify-png';

const diagrams = [
  ['architecture-system-context-20261004-024855/system-context.html', 'system-context.png'],
  ['architecture-containers-20261004-024855/containers.html', 'containers.png'],
  ['architecture-deployment-20261004-024855/deployment.html', 'deployment.png'],
  ['lifecycle-fsrs-20261004-024855/fsrs-lifecycle.html', 'fsrs-lifecycle.png'],
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

for (const [html, png] of diagrams) {
  const page = await browser.newPage({
    colorScheme: 'light',
    viewport: { width: 1700, height: 1300 },
    deviceScaleFactor: 2,
  });

  await page.goto(pathToFileURL(join(repoRoot, '.archify', html)).href);
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '.toolbar { display: none !important; }' });

  const target = page.locator('.container').first();
  await target.screenshot({ path: join(outDir, png) });
  console.log('captured:', png);
  await page.close();
}

await browser.close();
