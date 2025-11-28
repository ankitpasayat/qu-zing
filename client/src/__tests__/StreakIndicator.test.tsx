import { describe, it, expect } from 'vitest';
import { render, screen } from './test-utils';
import { StreakIndicator, StreakBadge } from '../components/StreakIndicator';
import type { StreakState, GambitState } from '../types/game';

describe('StreakIndicator Component', () => {
  const defaultStreak: StreakState = {
    current: 0,
    best: 0,
  };

  describe('Streak Display', () => {
    it('should not render when streak is under 2 and no gambit', () => {
      const { container } = render(
        <StreakIndicator streak={defaultStreak} gambit={null} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when streak is 1 and no gambit', () => {
      const { container } = render(
        <StreakIndicator streak={{ current: 1, best: 1 }} gambit={null} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render streak count when streak is 2+', () => {
      render(
        <StreakIndicator
          streak={{ current: 2, best: 2 }}
          gambit={null}
        />
      );

      expect(screen.getByText(/2 Streak!/)).toBeInTheDocument();
    });

    it('should show fire emoji for normal streak', () => {
      render(
        <StreakIndicator
          streak={{ current: 3, best: 3 }}
          gambit={null}
        />
      );

      expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('should show +1 bonus indicator at streak 2', () => {
      render(
        <StreakIndicator
          streak={{ current: 2, best: 2 }}
          gambit={null}
        />
      );

      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('should show +2 bonus indicator at streak 3', () => {
      render(
        <StreakIndicator
          streak={{ current: 3, best: 3 }}
          gambit={null}
        />
      );

      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('should show +3 bonus for higher streaks', () => {
      render(
        <StreakIndicator
          streak={{ current: 5, best: 5 }}
          gambit={null}
        />
      );

      expect(screen.getByText('+3')).toBeInTheDocument();
    });

    it('should display large streak numbers', () => {
      render(
        <StreakIndicator
          streak={{ current: 10, best: 10 }}
          gambit={null}
        />
      );

      expect(screen.getByText(/10 Streak!/)).toBeInTheDocument();
    });

    it('should hide bonus when showBonus is false', () => {
      render(
        <StreakIndicator
          streak={{ current: 3, best: 3 }}
          gambit={null}
          showBonus={false}
        />
      );

      expect(screen.queryByText('+2')).not.toBeInTheDocument();
    });
  });

  describe('Gambit Display', () => {
    it('should show gambit indicator when active', () => {
      const activeGambit: GambitState = {
        isActive: true,
        startedAtRound: 8,
        stakeTokenValue: 5,
        consecutiveCorrect: 1,
        completed: false,
        won: false,
      };

      render(
        <StreakIndicator
          streak={{ current: 3, best: 3 }}
          gambit={activeGambit}
        />
      );

      expect(screen.getByText(/GAMBIT/i)).toBeInTheDocument();
    });

    it('should show gambit progress', () => {
      const activeGambit: GambitState = {
        isActive: true,
        startedAtRound: 8,
        stakeTokenValue: 5,
        consecutiveCorrect: 2,
        completed: false,
        won: false,
      };

      render(
        <StreakIndicator
          streak={{ current: 3, best: 3 }}
          gambit={activeGambit}
        />
      );

      expect(screen.getByText(/2\/3/)).toBeInTheDocument();
    });

    it('should show blue plasma emoji for gambit', () => {
      const activeGambit: GambitState = {
        isActive: true,
        startedAtRound: 8,
        stakeTokenValue: 5,
        consecutiveCorrect: 1,
        completed: false,
        won: false,
      };

      render(
        <StreakIndicator
          streak={{ current: 3, best: 3 }}
          gambit={activeGambit}
        />
      );

      expect(screen.getByText('💠')).toBeInTheDocument();
    });

    it('should not show gambit when completed', () => {
      const completedGambit: GambitState = {
        isActive: true,
        startedAtRound: 8,
        stakeTokenValue: 5,
        consecutiveCorrect: 3,
        completed: true,
        won: true,
      };

      render(
        <StreakIndicator
          streak={{ current: 3, best: 3 }}
          gambit={completedGambit}
        />
      );

      expect(screen.queryByText(/GAMBIT/i)).not.toBeInTheDocument();
      // Should show normal fire instead
      expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('should render when gambit is active even with low streak', () => {
      const activeGambit: GambitState = {
        isActive: true,
        startedAtRound: 8,
        stakeTokenValue: 5,
        consecutiveCorrect: 0,
        completed: false,
        won: false,
      };

      const { container } = render(
        <StreakIndicator
          streak={{ current: 0, best: 3 }}
          gambit={activeGambit}
        />
      );

      expect(container.firstChild).not.toBeNull();
      expect(screen.getByText(/GAMBIT/i)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have pulsing animation', () => {
      const { container } = render(
        <StreakIndicator
          streak={{ current: 3, best: 3 }}
          gambit={null}
        />
      );

      const element = container.querySelector('.animate-pulse');
      expect(element).toBeInTheDocument();
    });

    it('should have bouncing fire emoji', () => {
      const { container } = render(
        <StreakIndicator
          streak={{ current: 3, best: 3 }}
          gambit={null}
        />
      );

      const bounceElement = container.querySelector('.animate-bounce');
      expect(bounceElement).toBeInTheDocument();
    });
  });
});

describe('StreakBadge Component', () => {
  it('should not render when streak is under 2', () => {
    const { container } = render(
      <StreakBadge streak={{ current: 1, best: 1 }} gambit={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render compact badge for streak 2+', () => {
    render(
      <StreakBadge streak={{ current: 3, best: 3 }} gambit={null} />
    );

    // The emoji and number are in the same span, so check for both in the container
    const badge = screen.getByTitle(/3 correct in a row/);
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('🔥');
    expect(badge.textContent).toContain('3');
  });

  it('should show blue styling for active gambit', () => {
    const activeGambit: GambitState = {
      isActive: true,
      startedAtRound: 8,
      stakeTokenValue: 5,
      consecutiveCorrect: 1,
      completed: false,
      won: false,
    };

    render(
      <StreakBadge streak={{ current: 3, best: 3 }} gambit={activeGambit} />
    );

    const badge = screen.getByTitle(/Gambit active/);
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('💠');
  });

  it('should have tooltip with streak info', () => {
    render(
      <StreakBadge streak={{ current: 4, best: 4 }} gambit={null} />
    );

    const badge = screen.getByTitle(/4 correct in a row/);
    expect(badge).toBeInTheDocument();
  });

  it('should mention gambit in tooltip when active', () => {
    const activeGambit: GambitState = {
      isActive: true,
      startedAtRound: 8,
      stakeTokenValue: 5,
      consecutiveCorrect: 1,
      completed: false,
      won: false,
    };

    render(
      <StreakBadge streak={{ current: 3, best: 3 }} gambit={activeGambit} />
    );

    const badge = screen.getByTitle(/Gambit active/);
    expect(badge).toBeInTheDocument();
  });
});
