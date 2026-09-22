import { authSessionSchema } from '@deckup/shared';
import type { ZodType } from 'zod';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: { path: string; message: string }[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;

  constructor(status: number, problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }

  get fieldErrors(): { path: string; message: string }[] {
    return this.problem.errors ?? [];
  }
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

const CSRF_HEADERS = { 'X-Requested-With': 'DeckUpWeb' } as const;

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export interface RequestOptions<T = unknown> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema?: ZodType<T>;
  signal?: AbortSignal;
  /** Disables the automatic refresh-and-retry on 401. */
  skipAuthRefresh?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
  const response = await send(path, options);

  if (response.status === 401 && !options.skipAuthRefresh && accessToken !== null) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return handleResponse<T>(await send(path, options), options);
    }
  }

  return handleResponse<T>(response, options);
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: RequestOptions<T> = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    credentials: 'include',
    body: formData,
  });

  return handleResponse<T>(response, options);
}

export interface DownloadedFile {
  blob: Blob;
  filename: string | null;
}

export async function apiDownload(path: string): Promise<DownloadedFile> {
  const response = await send(path, {});

  if (!response.ok) {
    throw new ApiError(response.status, await readProblem(response));
  }

  return {
    blob: await response.blob(),
    filename: filenameFrom(response.headers.get('content-disposition')),
  };
}

function filenameFrom(header: string | null): string | null {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] ?? null;
}

export async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { ...CSRF_HEADERS },
      credentials: 'include',
    });

    if (!response.ok) {
      setAccessToken(null);
      return false;
    }

    const session = authSessionSchema.parse(await response.json());
    setAccessToken(session.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

export async function clearSession(): Promise<void> {
  setAccessToken(null);

  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { ...CSRF_HEADERS },
      credentials: 'include',
    });
  } catch {
    // Logging out locally is enough if the network call fails.
  }
}

async function send(path: string, options: RequestOptions<unknown>): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
}

async function handleResponse<T>(response: Response, options: RequestOptions<T>): Promise<T> {
  if (response.status === 401) {
    setAccessToken(null);
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readProblem(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json();
  return options.schema ? options.schema.parse(payload) : (payload as T);
}

async function readProblem(response: Response): Promise<ProblemDetails> {
  try {
    const body: unknown = await response.json();

    if (typeof body === 'object' && body !== null && 'status' in body && 'title' in body) {
      return body as ProblemDetails;
    }
  } catch {
    // Fall through to the generic problem below.
  }

  return {
    type: 'about:blank',
    title: response.statusText || 'Request failed',
    status: response.status,
  };
}
