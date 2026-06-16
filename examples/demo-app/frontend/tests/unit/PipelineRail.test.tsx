import { render, screen } from '@testing-library/react';

import PipelineRail from '@/components/PipelineRail';

describe('PipelineRail', () => {
  it('renders all three pipeline stage headings', () => {
    render(<PipelineRail />);

    expect(screen.getByRole('heading', { name: 'Access Gate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quality' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Package' })).toBeInTheDocument();
  });

  it('renders the pipeline order summary', () => {
    render(<PipelineRail />);

    expect(screen.getByText(/Access Gate → Quality → Package/)).toBeInTheDocument();
  });

  it('renders the detail lines for each stage', () => {
    render(<PipelineRail />);

    expect(screen.getByText('Verifies repo registration')).toBeInTheDocument();
    expect(screen.getByText('Unit tests + coverage gate')).toBeInTheDocument();
    expect(screen.getByText('Promote branch on green')).toBeInTheDocument();
  });
});
