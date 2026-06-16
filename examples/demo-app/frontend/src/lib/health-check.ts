export type HealthState = 'idle' | 'checking' | 'online' | 'offline';

export interface HealthResult {
  state: HealthState;
  message: string;
}

/**
 * Reads the backend base URL from the environment. Returns null when unset
 * so callers can render a clear "not configured" state instead of firing a
 * request at a malformed URL.
 */
export function getApiBaseUrl(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.NEXT_PUBLIC_API_URL;
  if (!value || value.trim().length === 0) {
    return null;
  }
  // Strip a trailing slash so callers can safely append `/api/v1/health`.
  return value.trim().replace(/\/+$/, '');
}

/**
 * Builds the fully-qualified health endpoint URL from a base URL, per the
 * backend contract: `GET {NEXT_PUBLIC_API_URL}/api/v1/health`.
 */
export function buildHealthUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/api/v1/health`;
}

/**
 * Interprets a fetch Response + parsed body into a HealthResult. Separated
 * from the actual fetch call so the interpretation logic is unit-testable
 * without mocking the network.
 */
export function interpretHealthResponse(ok: boolean, status: number, body: unknown): HealthResult {
  if (!ok) {
    return { state: 'offline', message: `Backend responded with status ${status}.` };
  }

  if (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    typeof (body as { status: unknown }).status === 'string'
  ) {
    return { state: 'online', message: `Backend reports status: ${(body as { status: string }).status}.` };
  }

  return { state: 'online', message: 'Backend responded successfully.' };
}

/**
 * Fetches the backend health endpoint and returns an interpreted result.
 * Never throws — network failures and JSON parse failures both resolve to
 * an `offline` state so the calling component never needs a try/catch.
 */
export async function checkBackendHealth(
  env: Record<string, string | undefined> = process.env,
): Promise<HealthResult> {
  const baseUrl = getApiBaseUrl(env);

  if (!baseUrl) {
    return {
      state: 'offline',
      message: 'NEXT_PUBLIC_API_URL is not configured.',
    };
  }

  try {
    const response = await fetch(buildHealthUrl(baseUrl), { cache: 'no-store' });
    const body = await response.json().catch(() => null);
    return interpretHealthResponse(response.ok, response.status, body);
  } catch {
    return {
      state: 'offline',
      message: 'Could not reach the backend health endpoint.',
    };
  }
}
