import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { GambitPrompt, GambitStatus } from '../components/GambitPrompt';
import type { Player, GambitState, StreakState, PowerUp, DiscordUser } from '../types/game';

// Helper to create a mock player
function createMockPlayer(overrides: Partial<Player> = {}): Player {
  const defaultUser: DiscordUser = {
    id: 'user-123',
    username: 'TestPlayer',
    discriminator: '0',
    avatar: null,
    globalName: 'Test Player',
  };

  const defaultStreak: StreakState = {
    current: 0,
    best: 0,
  };

  const defaultPowerUps: PowerUp[] = [
    { type: 'double-down', used: false },
    { type: 'safety-net', used: false },
    { type: '50-50', used: false },
  ];

  return {
    id: 'player-123',
    discordUser: defaultUser,
    score: 50,
    tokenCounts: { 1: 1, 2: 1, 3: 1, 5: 1, 8: 1 },
    usedTokens: [],
    isHost: false,
    isConnected: true,
    isSpectator: false,
    joinedAt: Date.now(),
    powerUps: defaultPowerUps,
    streak: defaultStreak,
    gambit: null,
    lastAnswerTime: null,
    ...overrides,
  };
}

describe('GambitPrompt Component', () => {
  const mockOnActivate = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering Conditions', () => {
    it('should render on 3rd-to-last round (round 8 of 10)', () => {
      const player = createMockPlayer();

      render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText(/The Trifecta/i)).toBeInTheDocument();
    });

    it('should not render on other rounds', () => {
      const player = createMockPlayer();

      const { container } = render(
        <GambitPrompt
          player={player}
          currentRound={7}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render if player already has active gambit', () => {
      const player = createMockPlayer({
        gambit: {
          isActive: true,
          startedAtRound: 8,
          stakeTokenValue: 5,
          consecutiveCorrect: 1,
          completed: false,
          won: false,
        },
      });

      const { container } = render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render if player has no tokens', () => {
      const player = createMockPlayer({ tokenCounts: {} });

      const { container } = render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Content Display', () => {
    it('should show gambit prompt title', () => {
      const player = createMockPlayer();

      render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText(/The Trifecta/i)).toBeInTheDocument();
      expect(screen.getByText(/Endgame Gambit Available/i)).toBeInTheDocument();
    });

    it('should show stake token value (highest available)', () => {
      const player = createMockPlayer({
        tokenCounts: { 1: 1, 5: 1, 8: 1 },
      });

      render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText(/8 Token/)).toBeInTheDocument();
    });

    it('should show potential reward (2x stake)', () => {
      const player = createMockPlayer({
        tokenCounts: { 5: 1 },
      });

      render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      // 5 * 2 = 10 bonus points
      expect(screen.getByText(/\+10 bonus points/)).toBeInTheDocument();
    });

    it('should show penalty amount', () => {
      const player = createMockPlayer({
        tokenCounts: { 5: 1 },
      });

      render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText(/-5 points penalty/)).toBeInTheDocument();
    });

    it('should explain win condition (3 correct answers)', () => {
      const player = createMockPlayer();

      render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText(/3 questions/)).toBeInTheDocument();
      expect(screen.getByText(/correctly/)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onActivate when activate button clicked', async () => {
      const user = userEvent.setup();
      const player = createMockPlayer();

      render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      await user.click(screen.getByText(/Activate Gambit/i));

      expect(mockOnActivate).toHaveBeenCalledTimes(1);
    });

    it('should call onDismiss when dismiss button clicked', async () => {
      const user = userEvent.setup();
      const player = createMockPlayer();

      render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      await user.click(screen.getByText(/Not this time/i));

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('should have modal/overlay styling', () => {
      const player = createMockPlayer();

      const { container } = render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      const overlay = container.querySelector('.fixed');
      expect(overlay).toBeInTheDocument();
    });

    it('should show dice emoji', () => {
      const player = createMockPlayer();

      render(
        <GambitPrompt
          player={player}
          currentRound={8}
          totalRounds={10}
          onActivate={mockOnActivate}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('🎲')).toBeInTheDocument();
    });
  });
});

describe('GambitStatus Component', () => {
  it('should not render when gambit is null', () => {
    const { container } = render(<GambitStatus gambit={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when gambit is inactive', () => {
    const gambit: GambitState = {
      isActive: false,
      startedAtRound: 0,
      stakeTokenValue: 0,
      consecutiveCorrect: 0,
      completed: false,
      won: false,
    };

    const { container } = render(<GambitStatus gambit={gambit} />);
    expect(container.firstChild).toBeNull();
  });

  it('should show progress dots for active gambit', () => {
    const gambit: GambitState = {
      isActive: true,
      startedAtRound: 8,
      stakeTokenValue: 5,
      consecutiveCorrect: 1,
      completed: false,
      won: false,
    };

    const { container } = render(<GambitStatus gambit={gambit} />);
    
    // Should have 3 progress dots
    const dots = container.querySelectorAll('.rounded-full');
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it('should show remaining count', () => {
    const gambit: GambitState = {
      isActive: true,
      startedAtRound: 8,
      stakeTokenValue: 5,
      consecutiveCorrect: 1,
      completed: false,
      won: false,
    };

    render(<GambitStatus gambit={gambit} />);
    
    expect(screen.getByText(/2 to go/)).toBeInTheDocument();
  });

  it('should show won status when completed and won', () => {
    const gambit: GambitState = {
      isActive: true,
      startedAtRound: 8,
      stakeTokenValue: 5,
      consecutiveCorrect: 3,
      completed: true,
      won: true,
    };

    render(<GambitStatus gambit={gambit} />);
    
    expect(screen.getByText(/Gambit Won/)).toBeInTheDocument();
    expect(screen.getByText(/\+10/)).toBeInTheDocument(); // 5 * 2
  });

  it('should show failed status when completed and lost', () => {
    const gambit: GambitState = {
      isActive: true,
      startedAtRound: 8,
      stakeTokenValue: 5,
      consecutiveCorrect: 1,
      completed: true,
      won: false,
    };

    render(<GambitStatus gambit={gambit} />);
    
    expect(screen.getByText(/Gambit Failed/)).toBeInTheDocument();
    expect(screen.getByText(/-5/)).toBeInTheDocument();
  });
});
