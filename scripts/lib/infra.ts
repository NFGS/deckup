/**
 * Preflight and port helpers for the `--with-infra` measurements.
 *
 * They keep the refresh from spending minutes on Docker and Playwright only to
 * fail at the end, and they pick ports that are actually free on this machine
 * instead of assuming the defaults are available.
 */

import { createServer } from 'node:net';

/** Extracts the port from an API URL such as `http://localhost:3100/api/v1`. */
export function apiPortFromUrl(url: string | null | undefined): number | null {
  if (!url) {
    return null;
  }

  const match = /^https?:\/\/[^/]*?:(\d+)/.exec(url.trim());

  return match ? Number(match[1]) : null;
}

/** Reads `VITE_API_URL` out of a dotenv-style file body. */
export function viteApiUrlFromEnvFile(contents: string): string | null {
  const match = /^\s*VITE_API_URL\s*=\s*(.+?)\s*$/m.exec(contents);

  return match ? match[1].replace(/^["']|["']$/g, '') : null;
}

/** True when nothing is listening on the port (loopback). */
export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();

    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, '127.0.0.1');
  });
}

/** First free port at or after `start`, scanning a bounded range. */
export async function findFreePort(start: number, attempts = 50): Promise<number> {
  for (let port = start; port < start + attempts; port += 1) {
    if (await isPortFree(port)) {
      return port;
    }
  }

  throw new Error(`No free port found in ${start}–${start + attempts - 1}.`);
}

/** Parses the `Install location:` paths from `playwright install --dry-run`. */
export function playwrightInstallLocations(output: string): string[] {
  return [...output.matchAll(/Install location:\s*(.+)/g)].map((match) => match[1].trim());
}
