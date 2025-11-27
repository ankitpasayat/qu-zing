import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { TokenSelector } from '../components/TokenSelector';

// Helper to create tokenCounts from array
function createTokenCounts(tokens: number[]): Record<number, number> {
  const counts: Record<number, number> = {};
  tokens.forEach(t => {
    counts[t] = (counts[t] || 0) + 1;
  });
  return counts;
}

describe('TokenSelector Component', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all available tokens', () => {
    const tokens = [1, 2, 3, 4, 5];

    render(
      <TokenSelector
        tokenCounts={createTokenCounts(tokens)}
        selectedToken={null}
        onSelect={mockOnSelect}
      />
    );

    tokens.forEach((token) => {
      expect(screen.getByText(token.toString())).toBeInTheDocument();
    });
  });

  it('should show no tokens message when empty', () => {
    render(
      <TokenSelector
        tokenCounts={{}}
        selectedToken={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('No tokens remaining!')).toBeInTheDocument();
    expect(screen.getByText("You'll still earn points, just at 1x")).toBeInTheDocument();
  });

  it('should call onSelect when clicking a token', async () => {
    const user = userEvent.setup();

    render(
      <TokenSelector
        tokenCounts={createTokenCounts([1, 2, 3])}
        selectedToken={null}
        onSelect={mockOnSelect}
      />
    );

    await user.click(screen.getByText('2'));

    expect(mockOnSelect).toHaveBeenCalledWith(2);
  });

  it('should show bet information prompt', () => {
    render(
      <TokenSelector
        tokenCounts={createTokenCounts([1, 2, 3])}
        selectedToken={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('How confident are you? Bet a token:')).toBeInTheDocument();
  });

  it('should show point information when token is selected', () => {
    render(
      <TokenSelector
        tokenCounts={createTokenCounts([1, 2, 3, 5])}
        selectedToken={5}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Correct = +5 points • Wrong = lose token')).toBeInTheDocument();
  });

  it('should not show point information when no token selected', () => {
    render(
      <TokenSelector
        tokenCounts={createTokenCounts([1, 2, 3])}
        selectedToken={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.queryByText(/Correct = \+\d+ points/)).not.toBeInTheDocument();
  });

  it('should render tokens in sorted order', () => {
    render(
      <TokenSelector
        tokenCounts={createTokenCounts([5, 1, 3, 2])}
        selectedToken={null}
        onSelect={mockOnSelect}
      />
    );

    const buttons = screen.getAllByRole('button');
    const tokenValues = buttons.map((btn) => parseInt(btn.textContent || '0'));

    expect(tokenValues).toEqual([1, 2, 3, 5]);
  });

  it('should render all 10 tokens when available', () => {
    const allTokens = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    render(
      <TokenSelector
        tokenCounts={createTokenCounts(allTokens)}
        selectedToken={null}
        onSelect={mockOnSelect}
      />
    );

    allTokens.forEach((token) => {
      expect(screen.getByText(token.toString())).toBeInTheDocument();
    });
  });

  it('should highlight selected token with larger scale', () => {
    const { container } = render(
      <TokenSelector
        tokenCounts={createTokenCounts([1, 2, 3])}
        selectedToken={2}
        onSelect={mockOnSelect}
      />
    );

    const buttons = container.querySelectorAll('button');
    const selectedButton = Array.from(buttons).find((btn) => btn.textContent?.includes('2'));

    expect(selectedButton).toHaveClass('scale-110');
  });

  it('should not highlight non-selected tokens', () => {
    const { container } = render(
      <TokenSelector
        tokenCounts={createTokenCounts([1, 2, 3])}
        selectedToken={2}
        onSelect={mockOnSelect}
      />
    );

    const buttons = container.querySelectorAll('button');
    const nonSelectedButtons = Array.from(buttons).filter((btn) => !btn.textContent?.includes('2'));

    nonSelectedButtons.forEach((btn) => {
      expect(btn).not.toHaveClass('scale-110');
    });
  });

  describe('Stacked Tokens', () => {
    it('should show stack count badge for multiple tokens', () => {
      // 2x token "10"
      render(
        <TokenSelector
          tokenCounts={{ 10: 2 }}
          selectedToken={null}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument(); // Stack count badge
      expect(screen.getByText('10')).toBeInTheDocument(); // Token value
    });

    it('should not show badge for single tokens', () => {
      render(
        <TokenSelector
          tokenCounts={{ 5: 1 }}
          selectedToken={null}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      // No badge should exist
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(1);
    });
  });

  describe('Disabled State', () => {
    it('should show disabled message when disabled', () => {
      render(
        <TokenSelector
          tokenCounts={createTokenCounts([1, 2, 3])}
          selectedToken={null}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      expect(screen.getByText('Select an answer first to bet a token')).toBeInTheDocument();
    });

    it('should not call onSelect when disabled', async () => {
      const user = userEvent.setup();

      render(
        <TokenSelector
          tokenCounts={createTokenCounts([1, 2, 3])}
          selectedToken={null}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      // The container has pointer-events-none, but we try clicking anyway
      const button = screen.getByText('2');
      await user.click(button);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('should apply disabled styling to tokens', () => {
      const { container } = render(
        <TokenSelector
          tokenCounts={createTokenCounts([1, 2, 3])}
          selectedToken={null}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        expect(btn).toHaveClass('cursor-not-allowed');
        expect(btn).toHaveClass('scale-95');
        expect(btn).toBeDisabled();
      });
    });

    it('should have aria-disabled attribute when disabled', () => {
      const { container } = render(
        <TokenSelector
          tokenCounts={createTokenCounts([1, 2, 3])}
          selectedToken={null}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should show disabled tooltip on tokens when disabled', () => {
      const { container } = render(
        <TokenSelector
          tokenCounts={createTokenCounts([1, 2, 3])}
          selectedToken={null}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        expect(btn).toHaveAttribute('title', 'Select an answer first');
      });
    });

    it('should show bet tooltip on tokens when enabled', () => {
      render(
        <TokenSelector
          tokenCounts={createTokenCounts([1, 2, 3])}
          selectedToken={null}
          onSelect={mockOnSelect}
          disabled={false}
        />
      );

      expect(screen.getByTitle(/Bet 1 point/)).toBeInTheDocument();
      expect(screen.getByTitle(/Bet 2 points/)).toBeInTheDocument();
      expect(screen.getByTitle(/Bet 3 points/)).toBeInTheDocument();
    });
  });
});
