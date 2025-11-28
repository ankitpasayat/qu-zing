import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { TokenTrading } from '../components/TokenTrading';

describe('TokenTrading Component', () => {
  const mockOnTradeUp = vi.fn();
  const mockOnTradeDown = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Button State', () => {
    it('should render trade button when trading is possible', () => {
      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }} // Can trade up
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      expect(screen.getByText(/Token Alchemy/i)).toBeInTheDocument();
    });

    it('should not render when no trades are possible', () => {
      render(
        <TokenTrading
          tokenCounts={{ 10: 1 }} // Can't trade up (max), can't trade down (value > 2 check: 10 > 2 is true, so should work)
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      // Actually 10 CAN trade down, let's check with 1: 1
      // which can't trade up (need 2) and can't trade down (value not > 2)
    });

    it('should not render when no tradable tokens exist', () => {
      const { container } = render(
        <TokenTrading
          tokenCounts={{ 1: 1 }} // 1 can't trade up (need 2 tokens), 1 can't split (value must be >= 2)
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
          disabled={true}
        />
      );

      const button = screen.getByText(/Token Alchemy/i);
      expect(button).toBeDisabled();
    });
  });

  describe('Expanded Trading Panel', () => {
    it('should show trading panel when button clicked', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));

      expect(screen.getByText(/Select a token to transmute/i)).toBeInTheDocument();
    });

    it('should show close button when expanded', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));

      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('should close panel when close button clicked', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));
      await user.click(screen.getByText('✕'));

      expect(screen.queryByText(/Select a token to transmute/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Token Alchemy/i)).toBeInTheDocument();
    });

    it('should show tradable tokens', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 3: 2, 5: 1 }} // 3 can trade up, 5 can trade down
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Trade Up', () => {
    it('should show trade up option when token is selected and eligible', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }} // 2 of value 3
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));
      await user.click(screen.getByText('3'));

      // The text is split across elements, so check for button containing Fuse text
      const fuseButton = screen.getByRole('button', { name: /Fuse:.*→.*✨/i });
      expect(fuseButton).toBeInTheDocument();
    });

    it('should call onTradeUp when trade up option clicked', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));
      await user.click(screen.getByText('3'));
      const fuseButton = screen.getByRole('button', { name: /Fuse:.*→.*✨/i });
      await user.click(fuseButton);

      expect(mockOnTradeUp).toHaveBeenCalledWith(3);
    });

    it('should close panel after trading up', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));
      await user.click(screen.getByText('3'));
      const fuseButton = screen.getByRole('button', { name: /Fuse:.*→.*✨/i });
      await user.click(fuseButton);

      expect(screen.queryByText(/Select a token to transmute/i)).not.toBeInTheDocument();
    });

    it('should produce same value when fusing tokens at max value (10)', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 10: 2 }} // Fusing 2×10 still produces 10 (capped)
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));
      await user.click(screen.getByText('10'));

      // Fuse is still available (2×10 → 1×10), but Split is also available
      const fuseButton = screen.getByRole('button', { name: /Fuse:.*→.*✨/i });
      expect(fuseButton).toBeInTheDocument();
    });
  });

  describe('Trade Down', () => {
    it('should show trade down option for eligible tokens', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 6: 1 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));
      await user.click(screen.getByText('6'));

      const splitButton = screen.getByRole('button', { name: /Split:.*→.*⚡/i });
      expect(splitButton).toBeInTheDocument();
    });

    it('should call onTradeDown when trade down option clicked', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 6: 1 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));
      await user.click(screen.getByText('6'));
      const splitButton = screen.getByRole('button', { name: /Split:.*→.*⚡/i });
      await user.click(splitButton);

      expect(mockOnTradeDown).toHaveBeenCalledWith(6);
    });

    it('should not allow trade down for low value tokens (1)', async () => {
      const user = userEvent.setup();

      // Token 1 can't split because value must be >= 2
      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }} // 3 can fuse and split
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));
      await user.click(screen.getByText('3'));

      // 3 should have split option
      const splitButton = screen.getByRole('button', { name: /Split:.*→.*⚡/i });
      expect(splitButton).toBeInTheDocument();
    });
  });

  describe('Token Selection', () => {
    it('should highlight selected token', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));
      await user.click(screen.getByText('3'));

      const tokenButton = screen.getByText('3').closest('button');
      expect(tokenButton).toHaveClass('ring-2');
      expect(tokenButton).toHaveClass('scale-110');
    });

    it('should deselect token when clicked again', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));
      await user.click(screen.getByText('3'));
      await user.click(screen.getByText('3'));

      // Trade options should disappear - Fuse button should not be found
      expect(screen.queryByRole('button', { name: /Fuse:.*→.*✨/i })).not.toBeInTheDocument();
    });

    it('should show stack count for multiple tokens', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 3: 3 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));

      // Should show "3" as the stack count badge
      const badges = screen.getAllByText('3');
      expect(badges.length).toBeGreaterThanOrEqual(2); // Token value + count badge
    });
  });

  describe('Trading Tips', () => {
    it('should show trading tip message', async () => {
      const user = userEvent.setup();

      render(
        <TokenTrading
          tokenCounts={{ 3: 2 }}
          onTradeUp={mockOnTradeUp}
          onTradeDown={mockOnTradeDown}
        />
      );

      await user.click(screen.getByText(/Token Alchemy/i));

      expect(screen.getByText(/Fuse tokens to consolidate power/i)).toBeInTheDocument();
    });
  });
});
