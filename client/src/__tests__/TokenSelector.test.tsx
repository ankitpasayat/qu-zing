import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { TokenSelector } from '../components/TokenSelector';

describe('TokenSelector Component', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all available tokens', () => {
    const tokens = [1, 2, 3, 4, 5];

    render(
      <TokenSelector
        availableTokens={tokens}
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
        availableTokens={[]}
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
        availableTokens={[1, 2, 3]}
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
        availableTokens={[1, 2, 3]}
        selectedToken={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('How confident are you? Bet a token:')).toBeInTheDocument();
  });

  it('should show point information when token is selected', () => {
    render(
      <TokenSelector
        availableTokens={[1, 2, 3, 5]}
        selectedToken={5}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Correct = +5 points • Wrong = lose token')).toBeInTheDocument();
  });

  it('should not show point information when no token selected', () => {
    render(
      <TokenSelector
        availableTokens={[1, 2, 3]}
        selectedToken={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.queryByText(/Correct = \+\d+ points/)).not.toBeInTheDocument();
  });

  it('should render tokens in sorted order', () => {
    render(
      <TokenSelector
        availableTokens={[5, 1, 3, 2]}
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
        availableTokens={allTokens}
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
        availableTokens={[1, 2, 3]}
        selectedToken={2}
        onSelect={mockOnSelect}
      />
    );

    const buttons = container.querySelectorAll('button');
    const selectedButton = Array.from(buttons).find((btn) => btn.textContent === '2');

    expect(selectedButton).toHaveClass('scale-110');
  });

  it('should not highlight non-selected tokens', () => {
    const { container } = render(
      <TokenSelector
        availableTokens={[1, 2, 3]}
        selectedToken={2}
        onSelect={mockOnSelect}
      />
    );

    const buttons = container.querySelectorAll('button');
    const nonSelectedButtons = Array.from(buttons).filter((btn) => btn.textContent !== '2');

    nonSelectedButtons.forEach((btn) => {
      expect(btn).not.toHaveClass('scale-110');
    });
  });

  describe('Disabled State', () => {
    it('should show disabled message when disabled', () => {
      render(
        <TokenSelector
          availableTokens={[1, 2, 3]}
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
          availableTokens={[1, 2, 3]}
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
          availableTokens={[1, 2, 3]}
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
          availableTokens={[1, 2, 3]}
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
          availableTokens={[1, 2, 3]}
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
          availableTokens={[1, 2, 3]}
          selectedToken={null}
          onSelect={mockOnSelect}
          disabled={false}
        />
      );

      expect(screen.getByTitle('Bet 1 point')).toBeInTheDocument();
      expect(screen.getByTitle('Bet 2 points')).toBeInTheDocument();
      expect(screen.getByTitle('Bet 3 points')).toBeInTheDocument();
    });
  });
});
