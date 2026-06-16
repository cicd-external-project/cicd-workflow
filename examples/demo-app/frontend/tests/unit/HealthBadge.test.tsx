import { render, screen, waitFor } from '@testing-library/react';

import HealthBadge from '@/components/HealthBadge';

// HealthBadge renders the real checkBackendHealth result, which is driven by
// fetch. Mocking fetch (rather than the module) exercises the real component +
// health-check logic together and avoids SWC's non-configurable ESM exports.
describe('HealthBadge', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    jest.restoreAllMocks();
  });

  it('renders the checking state before the health check resolves', () => {
    // A fetch that never settles keeps the component in its initial state.
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    render(<HealthBadge />);

    expect(screen.getByRole('status')).toHaveTextContent('Checking backend…');
  });

  it('renders the online state once the health check resolves successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'ok' }),
    }) as unknown as typeof fetch;

    render(<HealthBadge />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Backend online');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Backend reports status: ok.');
  });

  it('renders the offline state when the health check fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    render(<HealthBadge />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Backend unreachable');
    });
  });
});
