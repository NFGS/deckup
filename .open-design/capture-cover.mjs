import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = resolve(import.meta.dirname, '..');
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1500, height: 600 },
  deviceScaleFactor: 2,
});

await page.goto(pathToFileURL(resolve(repoRoot, '.open-design/cover/index.html')).href);
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/opencode/archify-png/deckup-cover.png' });
console.log('captured: deckup-cover.png');
await browser.close();
