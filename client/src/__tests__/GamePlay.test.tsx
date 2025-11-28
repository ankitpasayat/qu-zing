import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { GamePlay } from '../components/GamePlay';
import type { GameSession, Player, Question } from '../types/game';

// Mock PlayerAvatar
vi.mock('../components/PlayerAvatar', () => ({
  PlayerAvatar: ({ user, size }: { user: { username: string }; size: number }) => (
    <div data-testid="player-avatar" style={{ width: size, height: size }}>
      {user.username}
    </div>
  ),
}));

// Helper to create mock data
function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    discordUser: {
      id: 'discord-1',
      username: 'TestPlayer',
      discriminator: '0000',
      avatar: null,
      globalName: 'TestPlayer',
    },
    score: 0,
    tokenCounts: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
    usedTokens: [],
    isHost: false,
    isSpectator: false,
    isConnected: true,
    joinedAt: Date.now(),
    powerUps: [
      { type: 'double-down', used: false },
      { type: 'safety-net', used: false },
      { type: '50-50', used: false },
    ],
    streak: { current: 0, best: 0 },
    gambit: null,
    lastAnswerTime: null,
    ...overrides,
  };
}

function createMockQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q-1',
    type: 'multiple-choice',
    text: 'What is 2 + 2?',
    category: 'Math',
    options: ['1', '2', '3', '4'],
    correctAnswer: 3,
    explanation: '2 + 2 equals 4',
    difficulty: 'easy',
    ...overrides,
  } as Question;
}

function createMockVote(playerId: string, answer: number, token: number) {
  return {
    playerId,
    answer,
    token,
    submittedAt: Date.now(),
    powerUpUsed: null,
    eliminatedOptions: null,
  };
}

function createMockSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    channelId: 'channel-123',
    guildId: 'guild-123',
    instanceId: 'instance-123',
    hostId: 'player-1',
    players: [createMockPlayer()],
    spectators: [],
    votes: [],
    currentPhase: 'question',
    currentRound: 1,
    totalRounds: 5,
    currentQuestion: createMockQuestion(),
    questionHistory: [],
    isGeneratingQuestions: false,
    settings: {
      totalRounds: 5,
      timeToAnswer: 30,
      timeBetweenQuestions: 5,
      timeToViewAnswer: 5,
      categories: ['Math'],
      allowMidGameJoin: true,
      showLeaderboardDuringGame: true,
      questionTimeLimit: 0,
    },
    createdAt: Date.now(),
    lastActivity: Date.now(),
    roundStartedAt: null,
    questionPhaseStartedAt: null,
    votingPhaseStartedAt: null,
    revealPhaseStartedAt: null,
    platform: 'discord',
    ...overrides,
  };
}

describe('GamePlay', () => {
  const defaultProps = {
    session: createMockSession(),
    currentPlayer: createMockPlayer(),
    isHost: true,
    onChangePhase: vi.fn(),
    onSubmitVote: vi.fn(),
    onAutoVote: vi.fn(),
    onExitGame: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  describe('Question Phase', () => {
    it('renders question phase with question text', () => {
      render(<GamePlay {...defaultProps} />);
      
      expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
      expect(screen.getByText(/Next Question/i)).toBeInTheDocument();
      expect(screen.getByText('Math')).toBeInTheDocument();
    });

    it('displays round information', () => {
      render(<GamePlay {...defaultProps} />);
      
      expect(screen.getByText('Round 1/5')).toBeInTheDocument();
    });

    it('shows spectator waiting message when player is spectator', () => {
      const spectatorPlayer = createMockPlayer({ isSpectator: true });
      render(
        <GamePlay
          {...defaultProps}
          currentPlayer={spectatorPlayer}
        />
      );
      
      expect(screen.getByText("You're In!")).toBeInTheDocument();
    });

    it('shows spectator message when player is in spectators array', () => {
      const player = createMockPlayer({ id: 'spectator-1', isSpectator: false });
      const sessionWithSpectator = createMockSession({
        spectators: [createMockPlayer({ id: 'spectator-1', isSpectator: true })],
      });
      
      render(
        <GamePlay
          {...defaultProps}
          session={sessionWithSpectator}
          currentPlayer={player}
        />
      );
      
      expect(screen.getByText("You're In!")).toBeInTheDocument();
    });
  });

  describe('Voting Phase', () => {
    const votingSession = createMockSession({ currentPhase: 'voting' });

    it('renders voting phase with answer options', () => {
      render(<GamePlay {...defaultProps} session={votingSession} />);
      
      expect(screen.getByText(/Make Your Choice/i)).toBeInTheDocument();
    });

    it('shows submit button disabled initially', () => {
      render(<GamePlay {...defaultProps} session={votingSession} />);
      
      const submitButton = screen.getByRole('button', { name: /Select answer and token/i });
      expect(submitButton).toBeDisabled();
    });

    it('shows vote submitted message after submitting', () => {
      const sessionWithVote = createMockSession({
        currentPhase: 'voting',
        votes: [createMockVote('player-1', 3, 1)],
      });
      
      render(<GamePlay {...defaultProps} session={sessionWithVote} />);
      
      expect(screen.getByText(/Vote Submitted!/)).toBeInTheDocument();
    });

    it('shows spectator view during voting phase', () => {
      const spectatorPlayer = createMockPlayer({ isSpectator: true });
      render(
        <GamePlay
          {...defaultProps}
          session={votingSession}
          currentPlayer={spectatorPlayer}
        />
      );
      
      expect(screen.getByText('Round in Progress')).toBeInTheDocument();
    });

    it('allows selecting answer and token then submitting', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<GamePlay {...defaultProps} session={votingSession} />);
      
      // Select an answer (D is 4, the 4th option)
      const answerButtons = screen.getAllByRole('button');
      const answerD = answerButtons.find(btn => btn.textContent?.includes('D.'));
      if (answerD) await user.click(answerD);
      
      // Select a token - find buttons in the token selector with data-testid or specific class
      const tokenButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '1');
      // The token "1" button (not the answer option "1")
      const tokenButton = tokenButtons.find(btn => !btn.textContent?.includes('.'));
      if (tokenButton) await user.click(tokenButton);
      
      // Submit
      const submitButton = screen.getByRole('button', { name: /Submit Vote/i });
      await user.click(submitButton);
      
      // Now includes power-up params (null, null) when no power-up selected
      expect(defaultProps.onSubmitVote).toHaveBeenCalledWith(3, 1, null, null);
    });
  });

  describe('Reveal Phase', () => {
    const revealSession = createMockSession({
      currentPhase: 'reveal',
      votes: [createMockVote('player-1', 3, 2)],
    });

    it('renders reveal phase with correct answer', () => {
      render(<GamePlay {...defaultProps} session={revealSession} />);
      
      expect(screen.getByText(/The Answer/i)).toBeInTheDocument();
      expect(screen.getByText(/Correct Answer/i)).toBeInTheDocument();
    });

    it('displays explanation for the answer', () => {
      render(<GamePlay {...defaultProps} session={revealSession} />);
      
      expect(screen.getByText('2 + 2 equals 4')).toBeInTheDocument();
    });

    it('shows final results label on last round', () => {
      const finalRoundSession = createMockSession({
        currentPhase: 'reveal',
        currentRound: 5,
        totalRounds: 5,
        votes: [createMockVote('player-1', 3, 2)],
      });
      
      render(<GamePlay {...defaultProps} session={finalRoundSession} />);
      
      expect(screen.getByText('Final results in')).toBeInTheDocument();
    });
  });

  describe('True/False Questions', () => {
    const tfSession = createMockSession({
      currentPhase: 'voting',
      currentQuestion: {
        id: 'q-tf',
        type: 'true-false',
        text: 'Is the sky blue?',
        category: 'Science',
        correctAnswer: true,
        explanation: 'The sky appears blue due to light scattering.',
        difficulty: 'easy',
      } as Question,
    });

    it('renders true/false buttons', () => {
      render(<GamePlay {...defaultProps} session={tfSession} />);
      
      expect(screen.getByRole('button', { name: 'TRUE' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'FALSE' })).toBeInTheDocument();
    });

    it('can select true option', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<GamePlay {...defaultProps} session={tfSession} />);
      
      const trueButton = screen.getByRole('button', { name: 'TRUE' });
      await user.click(trueButton);
      
      // Should have gradient class when selected
      expect(trueButton.className).toContain('bg-gradient');
    });
  });

  describe('More or Less Questions', () => {
    const molSession = createMockSession({
      currentPhase: 'voting',
      currentQuestion: {
        id: 'q-mol',
        type: 'more-or-less',
        text: 'Which is higher?',
        category: 'Geography',
        option1: 'Mount Everest',
        option2: 'K2',
        correctAnswer: 0,
        explanation: 'Mount Everest is the tallest.',
        difficulty: 'medium',
      } as Question,
    });

    it('renders more-or-less options', () => {
      render(<GamePlay {...defaultProps} session={molSession} />);
      
      expect(screen.getByText('Mount Everest')).toBeInTheDocument();
      expect(screen.getByText('K2')).toBeInTheDocument();
      expect(screen.getByText('OR')).toBeInTheDocument();
    });

    it('shows reveal with correct more-or-less answer (option1)', () => {
      const revealMol = createMockSession({
        currentPhase: 'reveal',
        currentQuestion: {
          id: 'q-mol',
          type: 'more-or-less',
          text: 'Which is higher?',
          category: 'Geography',
          option1: 'Mount Everest',
          option2: 'K2',
          correctAnswer: 0,
          explanation: 'Mount Everest is the tallest.',
          difficulty: 'medium',
        } as Question,
        votes: [createMockVote('player-1', 0, 2)],
      });

      render(<GamePlay {...defaultProps} session={revealMol} />);
      
      expect(screen.getByText('Mount Everest')).toBeInTheDocument();
    });

    it('shows reveal with correct more-or-less answer (option2)', () => {
      const revealMol = createMockSession({
        currentPhase: 'reveal',
        currentQuestion: {
          id: 'q-mol',
          type: 'more-or-less',
          text: 'Which has more population?',
          category: 'Geography',
          option1: 'France',
          option2: 'Germany',
          correctAnswer: 1, // option2 is correct
          explanation: 'Germany has more population.',
          difficulty: 'medium',
        } as Question,
        votes: [createMockVote('player-1', 1, 2)],
      });

      render(<GamePlay {...defaultProps} session={revealMol} />);
      
      expect(screen.getByText('Germany')).toBeInTheDocument();
    });
  });

  describe('Numerical Questions', () => {
    const numSession = createMockSession({
      currentPhase: 'voting',
      currentQuestion: {
        id: 'q-num',
        type: 'numerical',
        text: 'How many planets in our solar system?',
        category: 'Science',
        correctAnswer: 8,
        unit: 'planets',
        acceptableRange: 0,
        explanation: 'There are 8 planets.',
        difficulty: 'easy',
      } as Question,
    });

    it('renders numerical input', () => {
      render(<GamePlay {...defaultProps} session={numSession} />);
      
      expect(screen.getByPlaceholderText('Your answer...')).toBeInTheDocument();
      expect(screen.getByText(/in planets/)).toBeInTheDocument();
    });

    it('shows reveal with numerical answer and unit', () => {
      const revealNum = createMockSession({
        currentPhase: 'reveal',
        currentQuestion: {
          id: 'q-num',
          type: 'numerical',
          text: 'How many planets?',
          category: 'Science',
          correctAnswer: 8,
          unit: 'planets',
          acceptableRange: 1,
          explanation: 'There are 8 planets.',
          difficulty: 'easy',
        } as Question,
        votes: [createMockVote('player-1', 8, 2)],
      });

      render(<GamePlay {...defaultProps} session={revealNum} />);
      
      expect(screen.getByText('8 planets')).toBeInTheDocument();
    });

    it('shows reveal with numerical answer without unit', () => {
      const revealNum = createMockSession({
        currentPhase: 'reveal',
        currentQuestion: {
          id: 'q-num',
          type: 'numerical',
          text: 'What is 5 times 5?',
          category: 'Math',
          correctAnswer: 25,
          // no unit
          acceptableRange: 0,
          explanation: '5 times 5 equals 25.',
          difficulty: 'easy',
        } as Question,
        votes: [createMockVote('player-1', 25, 2)],
      });

      render(<GamePlay {...defaultProps} session={revealNum} />);
      
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('renders numerical input without unit', () => {
      const numSessionNoUnit = createMockSession({
        currentPhase: 'voting',
        currentQuestion: {
          id: 'q-num',
          type: 'numerical',
          text: 'What is 5 times 5?',
          category: 'Math',
          correctAnswer: 25,
          // no unit
          acceptableRange: 0,
          explanation: '5 times 5 equals 25.',
          difficulty: 'easy',
        } as Question,
      });

      render(<GamePlay {...defaultProps} session={numSessionNoUnit} />);
      
      expect(screen.getByPlaceholderText('Your answer...')).toBeInTheDocument();
      // Should show "Enter your answer" without unit specification
      expect(screen.getByText(/Enter your answer/)).toBeInTheDocument();
    });

    it('allows entering and clearing numerical answer', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<GamePlay {...defaultProps} session={numSession} />);
      
      const input = screen.getByPlaceholderText('Your answer...');
      
      // Enter a number
      await user.type(input, '42');
      expect(input).toHaveValue(42);
      
      // Clear the input
      await user.clear(input);
      expect(input).toHaveValue(null);
    });

    it('can submit numerical answer', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<GamePlay {...defaultProps} session={numSession} />);
      
      const input = screen.getByPlaceholderText('Your answer...');
      
      // Enter a number
      await user.type(input, '8');
      
      // Select a token
      const tokenButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '1');
      if (tokenButtons.length > 0) await user.click(tokenButtons[0]);
      
      // Submit
      const submitButton = screen.getByRole('button', { name: /Submit Vote/i });
      await user.click(submitButton);
      
      expect(defaultProps.onSubmitVote).toHaveBeenCalledWith(8, 1, null, null);
    });
  });

  describe('Exit Game', () => {
    it('shows exit button', () => {
      render(<GamePlay {...defaultProps} />);
      
      const exitButton = screen.getByTitle('Leave game');
      expect(exitButton).toBeInTheDocument();
    });

    it('shows confirmation modal when exit is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<GamePlay {...defaultProps} />);
      
      const exitButton = screen.getByTitle('Leave game');
      await user.click(exitButton);
      
      expect(screen.getByText(/Exit Game\?/i)).toBeInTheDocument();
    });

    it('calls onExitGame when confirmed', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<GamePlay {...defaultProps} />);
      
      const exitButton = screen.getByTitle('Leave game');
      await user.click(exitButton);
      
      const confirmButton = screen.getByRole('button', { name: 'Exit' });
      await user.click(confirmButton);
      
      expect(defaultProps.onExitGame).toHaveBeenCalled();
    });

    it('closes modal when cancelled', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<GamePlay {...defaultProps} />);
      
      const exitButton = screen.getByTitle('Leave game');
      await user.click(exitButton);
      
      const cancelButton = screen.getByRole('button', { name: 'Stay' });
      await user.click(cancelButton);
      
      expect(screen.queryByText(/Exit Game\?/i)).not.toBeInTheDocument();
    });

    it('shows solo mode message when only one player', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<GamePlay {...defaultProps} />);
      
      const exitButton = screen.getByTitle('Leave game');
      await user.click(exitButton);
      
      expect(screen.getByText(/solo game/i)).toBeInTheDocument();
    });
  });

  describe('Returns null for unknown phase', () => {
    it('returns null when phase is not recognized', () => {
      const unknownSession = createMockSession({
        currentPhase: 'lobby' as GameSession['currentPhase'],
        currentQuestion: null,
      });
      
      const { container } = render(<GamePlay {...defaultProps} session={unknownSession} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Browser Mode', () => {
    it('shows lobby code in browser mode', () => {
      const browserSession = createMockSession({ platform: 'browser', channelId: 'ABC123' });
      render(<GamePlay {...defaultProps} session={browserSession} />);
      
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });
  });

  describe('Timer Auto-Submit', () => {
    it('uses selected answer and token when timer expires', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const votingSession = createMockSession({
        currentPhase: 'voting',
        currentQuestion: createMockQuestion(),
        votingPhaseStartedAt: Date.now(),
        settings: {
          ...createMockSession().settings,
          timeToAnswer: 5, // 5 seconds
        },
      });

      render(<GamePlay {...defaultProps} session={votingSession} />);
      
      // Select an answer (option D = index 3)
      const optionD = screen.getByRole('button', { name: /D\./i });
      await user.click(optionD);
      
      // Select a token (token 5)
      const allButtons = screen.getAllByRole('button');
      const tokenButtons = allButtons.filter(btn => btn.textContent === '5');
      if (tokenButtons.length > 0) await user.click(tokenButtons[0]);
      
      // Advance timer past voting time
      await vi.advanceTimersByTimeAsync(6000);
      
      // Should have called onSubmitVote with selected answer (3) and token (5)
      expect(defaultProps.onSubmitVote).toHaveBeenCalledWith(3, 5);
    });

    it('uses random answer and lowest token when no selection made', async () => {
      const votingSession = createMockSession({
        currentPhase: 'voting',
        currentQuestion: createMockQuestion(),
        votingPhaseStartedAt: Date.now(),
        settings: {
          ...createMockSession().settings,
          timeToAnswer: 5, // 5 seconds
        },
      });

      render(<GamePlay {...defaultProps} session={votingSession} />);
      
      // Don't select anything, just wait for timer
      await vi.advanceTimersByTimeAsync(6000);
      
      // Should have called onSubmitVote with some answer and lowest token (1)
      expect(defaultProps.onSubmitVote).toHaveBeenCalled();
      const call = defaultProps.onSubmitVote.mock.calls[0];
      expect(call[1]).toBe(1); // Lowest token is 1
    });

    it('cannot select token without selecting answer first (token selector is disabled)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const votingSession = createMockSession({
        currentPhase: 'voting',
        currentQuestion: createMockQuestion(),
        votingPhaseStartedAt: Date.now(),
        settings: {
          ...createMockSession().settings,
          timeToAnswer: 5, // 5 seconds
        },
      });

      render(<GamePlay {...defaultProps} session={votingSession} />);
      
      // Try to select a token without selecting an answer first
      // Token selector should be disabled, so clicking should have no effect
      const allButtons = screen.getAllByRole('button');
      const tokenButtons = allButtons.filter(btn => btn.textContent === '3');
      if (tokenButtons.length > 0) await user.click(tokenButtons[0]);
      
      // Advance timer
      await vi.advanceTimersByTimeAsync(6000);
      
      // Since token selector was disabled, token selection didn't work
      // Auto-submit should use lowest token (1) since no token was actually selected
      expect(defaultProps.onSubmitVote).toHaveBeenCalled();
      const call = defaultProps.onSubmitVote.mock.calls[0];
      expect(call[1]).toBe(1); // Lowest token because token selector was disabled
    });
  });
});
