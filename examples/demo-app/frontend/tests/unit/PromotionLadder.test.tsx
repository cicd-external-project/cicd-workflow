import { render, screen } from '@testing-library/react';

import PromotionLadder from '@/components/PromotionLadder';

describe('PromotionLadder', () => {
  it('renders the three promotion steps in order', () => {
    render(<PromotionLadder />);

    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('uat')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('renders the step progress summary', () => {
    render(<PromotionLadder />);

    expect(screen.getByText(/Step 3 of 3 — main/)).toBeInTheDocument();
  });

  it('renders a description for each step', () => {
    render(<PromotionLadder />);

    expect(
      screen.getByText('Feature and bugfix branches merge here first.'),
    ).toBeInTheDocument();
  });
});
