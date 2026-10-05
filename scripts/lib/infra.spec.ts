import { createServer } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  apiPortFromUrl,
  findFreePort,
  isPortFree,
  playwrightInstallLocations,
  viteApiUrlFromEnvFile,
} from './infra.ts';

describe('apiPortFromUrl', () => {
  it('reads the port from a local URL', () => {
    expect(apiPortFromUrl('http://localhost:3100/api/v1')).toBe(3100);
  });

  it('reads the port from a remote URL', () => {
    expect(apiPortFromUrl('https://api.example.com:8443/api/v1')).toBe(8443);
  });

  it('returns null without an explicit port', () => {
    expect(apiPortFromUrl('https://api.example.com/api/v1')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(apiPortFromUrl(null)).toBeNull();
    expect(apiPortFromUrl(undefined)).toBeNull();
  });
});

describe('viteApiUrlFromEnvFile', () => {
  it('reads the value from a dotenv body', () => {
    expect(viteApiUrlFromEnvFile('VITE_API_URL=http://localhost:3100/api/v1\n')).toBe(
      'http://localhost:3100/api/v1',
    );
  });

  it('tolerates quotes and surrounding lines', () => {
    expect(viteApiUrlFromEnvFile('# comment\nVITE_API_URL="http://localhost:3100/api/v1"\n')).toBe(
      'http://localhost:3100/api/v1',
    );
  });

  it('returns null when the key is absent', () => {
    expect(viteApiUrlFromEnvFile('OTHER=1')).toBeNull();
  });
});

describe('playwrightInstallLocations', () => {
  it('parses every install location', () => {
    const output = [
      'Chrome for Testing (playwright chromium v1243)',
      '  Install location:    /home/user/.cache/ms-playwright/chromium-1243',
      'FFmpeg (playwright ffmpeg v1011)',
      '  Install location:    /home/user/.cache/ms-playwright/ffmpeg-1011',
    ].join('\n');

    expect(playwrightInstallLocations(output)).toEqual([
      '/home/user/.cache/ms-playwright/chromium-1243',
      '/home/user/.cache/ms-playwright/ffmpeg-1011',
    ]);
  });

  it('returns an empty list when nothing is reported', () => {
    expect(playwrightInstallLocations('nothing')).toEqual([]);
  });
});

describe('port probing', () => {
  const held = createServer();
  let takenPort = 0;

  beforeAll(async () => {
    await new Promise<void>((resolve) => held.listen(0, '127.0.0.1', resolve));
    const address = held.address();
    takenPort = typeof address === 'object' && address ? address.port : 0;
  });

  afterAll(() => {
    held.close();
  });

  it('detects a port that is already in use', async () => {
    expect(takenPort).toBeGreaterThan(0);
    expect(await isPortFree(takenPort)).toBe(false);
  });

  it('finds a free port from a taken starting point', async () => {
    const free = await findFreePort(takenPort);

    expect(free).toBeGreaterThan(takenPort);
    expect(await isPortFree(free)).toBe(true);
  });
});
