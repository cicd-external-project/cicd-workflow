import {
  buildHealthUrl,
  checkBackendHealth,
  getApiBaseUrl,
  interpretHealthResponse,
} from './health-check';

describe('getApiBaseUrl', () => {
  it('returns the configured URL with no trailing slash', () => {
    expect(getApiBaseUrl({ NEXT_PUBLIC_API_URL: 'http://localhost:4000/' })).toBe(
      'http://localhost:4000',
    );
  });

  it('returns null when unset', () => {
    expect(getApiBaseUrl({})).toBeNull();
  });

  it('returns null when set to an empty/whitespace string', () => {
    expect(getApiBaseUrl({ NEXT_PUBLIC_API_URL: '   ' })).toBeNull();
  });
});

describe('buildHealthUrl', () => {
  it('appends the health path to a base URL', () => {
    expect(buildHealthUrl('http://localhost:4000')).toBe('http://localhost:4000/api/v1/health');
  });

  it('strips a trailing slash before appending', () => {
    expect(buildHealthUrl('http://localhost:4000/')).toBe('http://localhost:4000/api/v1/health');
  });
});

describe('interpretHealthResponse', () => {
  it('reports offline when the response is not ok', () => {
    expect(interpretHealthResponse(false, 503, null)).toEqual({
      state: 'offline',
      message: 'Backend responded with status 503.',
    });
  });

  it('reports online with the body status when present', () => {
    expect(interpretHealthResponse(true, 200, { status: 'ok' })).toEqual({
      state: 'online',
      message: 'Backend reports status: ok.',
    });
  });

  it('reports online with a generic message when the body has no status field', () => {
    expect(interpretHealthResponse(true, 200, null)).toEqual({
      state: 'online',
      message: 'Backend responded successfully.',
    });
  });

  it('reports online with a generic message when the body status is not a string', () => {
    expect(interpretHealthResponse(true, 200, { status: 1 })).toEqual({
      state: 'online',
      message: 'Backend responded successfully.',
    });
  });
});

describe('checkBackendHealth', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns offline when NEXT_PUBLIC_API_URL is not configured', async () => {
    const result = await checkBackendHealth({});
    expect(result).toEqual({
      state: 'offline',
      message: 'NEXT_PUBLIC_API_URL is not configured.',
    });
  });

  it('returns online when the backend responds successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'ok' }),
    }) as unknown as typeof fetch;

    const result = await checkBackendHealth({ NEXT_PUBLIC_API_URL: 'http://localhost:4000' });

    expect(result).toEqual({ state: 'online', message: 'Backend reports status: ok.' });
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:4000/api/v1/health', {
      cache: 'no-store',
    });
  });

  it('returns offline when the backend responds with an error status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve(null),
    }) as unknown as typeof fetch;

    const result = await checkBackendHealth({ NEXT_PUBLIC_API_URL: 'http://localhost:4000' });

    expect(result).toEqual({ state: 'offline', message: 'Backend responded with status 500.' });
  });

  it('returns offline when the fetch throws (network failure)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const result = await checkBackendHealth({ NEXT_PUBLIC_API_URL: 'http://localhost:4000' });

    expect(result).toEqual({
      state: 'offline',
      message: 'Could not reach the backend health endpoint.',
    });
  });

  it('returns offline when the response body is not valid JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('invalid json')),
    }) as unknown as typeof fetch;

    const result = await checkBackendHealth({ NEXT_PUBLIC_API_URL: 'http://localhost:4000' });

    expect(result).toEqual({ state: 'online', message: 'Backend responded successfully.' });
  });
});
