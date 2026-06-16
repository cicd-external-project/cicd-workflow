import { render, screen, waitFor } from '@testing-library/react';

import Home from '@/app/page';

describe('Home page', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    // checkBackendHealth short-circuits to "offline" when this is unset, so the
    // mocked fetch below is only reached once a base URL is configured.
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'ok' }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    jest.restoreAllMocks();
  });

  it('renders the FlowCI demo heading', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: /FlowCI demo project/ })).toBeInTheDocument();
  });

  it('renders all three pipeline stage cards', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'Access Gate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quality' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Package' })).toBeInTheDocument();
  });

  it('renders the promotion ladder steps', () => {
    render(<Home />);

    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('uat')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('renders the health badge and resolves to an online state', async () => {
    render(<Home />);

    expect(screen.getByRole('status')).toHaveTextContent('Checking backend…');

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Backend online');
    });
  });
});
