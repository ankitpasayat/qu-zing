import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { Results } from '../components/Results';
import type { GameSession, Player, DiscordUser } from '../types/game';

const createMockUser = (overrides: Partial<DiscordUser> = {}): DiscordUser => ({
  id: '123456789012345678',
  username: 'TestUser',
  discriminator: '0',
  avatar: null,
  globalName: 'Test User',
  ...overrides,
});

const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: '123456789012345678',
  discordUser: createMockUser(),
  score: 0,
  availableTokens: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  usedTokens: [],
  isHost: false,
  isConnected: true,
  isSpectator: false,
  joinedAt: Date.now(),
  ...overrides,
});

const createMockSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  channelId: 'test-channel',
  guildId: 'test-guild',
  instanceId: 'test-instance',
  platform: 'browser',
  hostId: '123456789012345678',
  players: [],
  spectators: [],
  currentPhase: 'results',
  currentRound: 10,
  totalRounds: 10,
  currentQuestion: null,
  votes: [],
  questionHistory: [],
  isGeneratingQuestions: false,
  settings: {
    totalRounds: 10,
    questionTimeLimit: 0,
    allowMidGameJoin: true,
    showLeaderboardDuringGame: true,
    categories: [],
    timeBetweenQuestions: 5,
    timeToAnswer: 10,
    timeToViewAnswer: 5,
  },
  createdAt: Date.now(),
  lastActivity: Date.now(),
  roundStartedAt: null,
  questionPhaseStartedAt: null,
  votingPhaseStartedAt: null,
  revealPhaseStartedAt: null,
  ...overrides,
});

describe('Results Component', () => {
  const mockOnPlayAgain = vi.fn();
  const mockOnExitGame = vi.fn();
  const mockOnCancelPlayAgain = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render game over header', () => {
    const currentPlayer = createMockPlayer({ isHost: true, score: 25 });
    const session = createMockSession({ players: [currentPlayer] });

    render(
      <Results
        session={session}
        currentPlayer={currentPlayer}
        isHost={true}
        onPlayAgain={mockOnPlayAgain}
        onExitGame={mockOnExitGame}
      />
    );

    expect(screen.getByText('🎉 Game Over!')).toBeInTheDocument();
  });

  describe('Solo Game', () => {
    it('should show solo game message', () => {
      const currentPlayer = createMockPlayer({ isHost: true, score: 25 });
      const session = createMockSession({ players: [currentPlayer] });

      render(
        <Results
          session={session}
          currentPlayer={currentPlayer}
          isHost={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      expect(screen.getByText('Great solo practice session!')).toBeInTheDocument();
    });

    it('should show player score', () => {
      const currentPlayer = createMockPlayer({ isHost: true, score: 35 });
      const session = createMockSession({ players: [currentPlayer] });

      render(
        <Results
          session={session}
          currentPlayer={currentPlayer}
          isHost={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      expect(screen.getByText('35')).toBeInTheDocument();
    });
  });

  describe('Multiplayer Game', () => {
    it('should show winner with crown', () => {
      const winner = createMockPlayer({
        id: '111111111111111111',
        isHost: true,
        score: 45,
        discordUser: createMockUser({ id: '111111111111111111', globalName: 'Winner Player' }),
      });
      const loser = createMockPlayer({
        id: '222222222222222222',
        score: 20,
        discordUser: createMockUser({ id: '222222222222222222', globalName: 'Other Player' }),
      });
      const session = createMockSession({ players: [winner, loser] });

      render(
        <Results
          session={session}
          currentPlayer={winner}
          isHost={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      expect(screen.getByText('👑')).toBeInTheDocument();
      expect(screen.getAllByText('Winner Player').length).toBeGreaterThan(0);
    });

    it('should show player placement', () => {
      const player1 = createMockPlayer({
        id: '111111111111111111',
        isHost: true,
        score: 45,
        discordUser: createMockUser({ id: '111111111111111111', globalName: 'First' }),
      });
      const player2 = createMockPlayer({
        id: '222222222222222222',
        score: 30,
        discordUser: createMockUser({ id: '222222222222222222', globalName: 'Second' }),
      });
      const session = createMockSession({ players: [player1, player2] });

      render(
        <Results
          session={session}
          currentPlayer={player2}
          isHost={false}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      // Player 2 is ranked second, so check for "You placed #2 of 2"
      expect(screen.getByText(/You placed/)).toBeInTheDocument();
      expect(screen.getByText(/of 2/)).toBeInTheDocument();
    });

    it('should show medals for top 3', () => {
      const player1 = createMockPlayer({ id: '111111111111111111', score: 50, isHost: true, discordUser: createMockUser({ id: '111111111111111111' }) });
      const player2 = createMockPlayer({ id: '222222222222222222', score: 40, discordUser: createMockUser({ id: '222222222222222222' }) });
      const player3 = createMockPlayer({ id: '333333333333333333', score: 30, discordUser: createMockUser({ id: '333333333333333333' }) });
      const session = createMockSession({ players: [player1, player2, player3] });

      render(
        <Results
          session={session}
          currentPlayer={player1}
          isHost={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      expect(screen.getByText('🥇')).toBeInTheDocument();
      expect(screen.getByText('🥈')).toBeInTheDocument();
      expect(screen.getByText('🥉')).toBeInTheDocument();
    });
  });

  describe('Host Controls', () => {
    it('should show play again button for host', () => {
      const currentPlayer = createMockPlayer({ isHost: true });
      const session = createMockSession({ players: [currentPlayer] });

      render(
        <Results
          session={session}
          currentPlayer={currentPlayer}
          isHost={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      expect(screen.getByRole('button', { name: /Play Again/i })).toBeInTheDocument();
    });

    it('should call onPlayAgain when clicking play again', async () => {
      const user = userEvent.setup();
      const currentPlayer = createMockPlayer({ isHost: true });
      const session = createMockSession({ players: [currentPlayer] });

      render(
        <Results
          session={session}
          currentPlayer={currentPlayer}
          isHost={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      await user.click(screen.getByRole('button', { name: /Play Again/i }));

      expect(mockOnPlayAgain).toHaveBeenCalled();
    });

    it('should show generating state when isStartingGame is true', () => {
      const currentPlayer = createMockPlayer({ isHost: true });
      const session = createMockSession({ players: [currentPlayer] });

      render(
        <Results
          session={session}
          currentPlayer={currentPlayer}
          isHost={true}
          isStartingGame={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
          onCancelPlayAgain={mockOnCancelPlayAgain}
        />
      );

      expect(screen.getByText('Generating questions...')).toBeInTheDocument();
    });

    it('should show cancel button when generating', () => {
      const currentPlayer = createMockPlayer({ isHost: true });
      const session = createMockSession({ players: [currentPlayer] });

      render(
        <Results
          session={session}
          currentPlayer={currentPlayer}
          isHost={true}
          isStartingGame={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
          onCancelPlayAgain={mockOnCancelPlayAgain}
        />
      );

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  describe('Non-Host View', () => {
    it('should show waiting message for non-host', () => {
      const host = createMockPlayer({ id: '111111111111111111', isHost: true, discordUser: createMockUser({ id: '111111111111111111' }) });
      const nonHost = createMockPlayer({ id: '222222222222222222', discordUser: createMockUser({ id: '222222222222222222' }) });
      const session = createMockSession({ players: [host, nonHost] });

      render(
        <Results
          session={session}
          currentPlayer={nonHost}
          isHost={false}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      expect(screen.getByText('Waiting for host to start a new game...')).toBeInTheDocument();
    });

    it('should not show play again button for non-host', () => {
      const host = createMockPlayer({ id: '111111111111111111', isHost: true, discordUser: createMockUser({ id: '111111111111111111' }) });
      const nonHost = createMockPlayer({ id: '222222222222222222', discordUser: createMockUser({ id: '222222222222222222' }) });
      const session = createMockSession({ players: [host, nonHost] });

      render(
        <Results
          session={session}
          currentPlayer={nonHost}
          isHost={false}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      expect(screen.queryByRole('button', { name: /Play Again/i })).not.toBeInTheDocument();
    });
  });

  describe('Exit Game', () => {
    it('should show go to lobby button', () => {
      const currentPlayer = createMockPlayer({ isHost: true });
      const session = createMockSession({ players: [currentPlayer] });

      render(
        <Results
          session={session}
          currentPlayer={currentPlayer}
          isHost={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      expect(screen.getByRole('button', { name: /Go to Lobby/i })).toBeInTheDocument();
    });

    it('should call onExitGame when clicking exit', async () => {
      const user = userEvent.setup();
      const currentPlayer = createMockPlayer({ isHost: true });
      const session = createMockSession({ players: [currentPlayer] });

      render(
        <Results
          session={session}
          currentPlayer={currentPlayer}
          isHost={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      await user.click(screen.getByRole('button', { name: /Go to Lobby/i }));

      expect(mockOnExitGame).toHaveBeenCalled();
    });
  });

  describe('Spectators', () => {
    it('should show spectators if present', () => {
      const currentPlayer = createMockPlayer({ isHost: true });
      const spectator = createMockPlayer({
        id: '444444444444444444',
        isSpectator: true,
        discordUser: createMockUser({ id: '444444444444444444', globalName: 'Spectator Sam' }),
      });
      const session = createMockSession({
        players: [currentPlayer],
        spectators: [spectator],
      });

      render(
        <Results
          session={session}
          currentPlayer={currentPlayer}
          isHost={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      expect(screen.getByText(/Spectators:/)).toBeInTheDocument();
      expect(screen.getByText(/Spectator Sam/)).toBeInTheDocument();
    });
  });

  describe('Browser Mode', () => {
    it('should show lobby code in browser mode', () => {
      const currentPlayer = createMockPlayer({ isHost: true });
      const session = createMockSession({
        players: [currentPlayer],
        platform: 'browser',
        channelId: 'ABCD12',
      });

      render(
        <Results
          session={session}
          currentPlayer={currentPlayer}
          isHost={true}
          onPlayAgain={mockOnPlayAgain}
          onExitGame={mockOnExitGame}
        />
      );

      expect(screen.getByText('ABCD12')).toBeInTheDocument();
    });
  });
});
