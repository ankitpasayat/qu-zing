import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { Lobby } from '../components/Lobby';
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
  players: [createMockPlayer({ isHost: true })],
  spectators: [],
  currentPhase: 'lobby',
  currentRound: 0,
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

describe('Lobby Component', () => {
  const mockOnStartGame = vi.fn();
  const mockOnInviteFriends = vi.fn();
  const mockOnUpdateSettings = vi.fn();
  const mockOnExitGame = vi.fn();
  const mockOnCancelGeneration = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render players grid', () => {
    const session = createMockSession();
    const currentPlayer = session.players[0];

    render(
      <Lobby
        session={session}
        currentPlayer={currentPlayer}
        isHost={true}
        onStartGame={mockOnStartGame}
        onInviteFriends={mockOnInviteFriends}
        onUpdateSettings={mockOnUpdateSettings}
      />
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
  });

  it('should show player count', () => {
    const session = createMockSession({
      players: [
        createMockPlayer({ id: '111111111111111111', isHost: true, discordUser: createMockUser({ id: '111111111111111111', globalName: 'Player 1' }) }),
        createMockPlayer({ id: '222222222222222222', discordUser: createMockUser({ id: '222222222222222222', globalName: 'Player 2' }) }),
      ],
    });

    render(
      <Lobby
        session={session}
        currentPlayer={session.players[0]}
        isHost={true}
        onStartGame={mockOnStartGame}
        onInviteFriends={mockOnInviteFriends}
        onUpdateSettings={mockOnUpdateSettings}
      />
    );

    expect(screen.getByText('Players (2)')).toBeInTheDocument();
  });

  it('should show solo mode indicator for single player', () => {
    const session = createMockSession();

    render(
      <Lobby
        session={session}
        currentPlayer={session.players[0]}
        isHost={true}
        onStartGame={mockOnStartGame}
        onInviteFriends={mockOnInviteFriends}
        onUpdateSettings={mockOnUpdateSettings}
      />
    );

    expect(screen.getByText('Solo mode available!')).toBeInTheDocument();
  });

  describe('Host Controls', () => {
    it('should show start game button for host', () => {
      const session = createMockSession();

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      expect(screen.getByRole('button', { name: /Start Solo Game/i })).toBeInTheDocument();
    });

    it('should show settings panel for host', () => {
      const session = createMockSession();

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      expect(screen.getByText('⚙️ Game Settings')).toBeInTheDocument();
    });

    it('should call onStartGame when clicking start button', async () => {
      const user = userEvent.setup();
      const session = createMockSession();

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      await user.click(screen.getByRole('button', { name: /Start Solo Game/i }));

      expect(mockOnStartGame).toHaveBeenCalled();
    });

    it('should show generating state when isStartingGame is true', () => {
      const session = createMockSession({ isGeneratingQuestions: true });

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          isStartingGame={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      expect(screen.getByText('Generating questions...')).toBeInTheDocument();
    });

    it('should show cancel button when generating', () => {
      const session = createMockSession({ isGeneratingQuestions: true });

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
          onCancelGeneration={mockOnCancelGeneration}
        />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should call onCancelGeneration when clicking cancel', async () => {
      const user = userEvent.setup();
      const session = createMockSession({ isGeneratingQuestions: true });

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
          onCancelGeneration={mockOnCancelGeneration}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnCancelGeneration).toHaveBeenCalled();
    });
  });

  describe('Non-Host View', () => {
    it('should show waiting message for non-host', () => {
      const session = createMockSession({
        players: [
          createMockPlayer({ id: '111111111111111111', isHost: true }),
          createMockPlayer({ id: '222222222222222222', discordUser: createMockUser({ id: '222222222222222222' }) }),
        ],
      });

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[1]}
          isHost={false}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      expect(screen.getByText('Waiting for host to start...')).toBeInTheDocument();
    });

    it('should not show settings panel for non-host', () => {
      const session = createMockSession({
        players: [
          createMockPlayer({ id: '111111111111111111', isHost: true }),
          createMockPlayer({ id: '222222222222222222' }),
        ],
      });

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[1]}
          isHost={false}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      expect(screen.queryByText('⚙️ Game Settings')).not.toBeInTheDocument();
    });
  });

  describe('Browser Mode', () => {
    it('should show lobby code display in browser mode', () => {
      const session = createMockSession({ platform: 'browser', channelId: 'ABC123' });

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('should show exit button in browser mode', () => {
      const session = createMockSession({ platform: 'browser' });

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
          onExitGame={mockOnExitGame}
        />
      );

      expect(screen.getByTitle('Leave lobby')).toBeInTheDocument();
    });
  });

  describe('Discord Mode', () => {
    it('should show invite friends button in discord mode', () => {
      const session = createMockSession({ platform: 'discord' });

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      expect(screen.getByText('Invite Friends')).toBeInTheDocument();
    });

    it('should call onInviteFriends when clicking invite button', async () => {
      const user = userEvent.setup();
      const session = createMockSession({ platform: 'discord' });

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      await user.click(screen.getByText('Invite Friends'));

      expect(mockOnInviteFriends).toHaveBeenCalled();
    });
  });

  describe('How to Play', () => {
    it('should display game rules', () => {
      const session = createMockSession();

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      expect(screen.getByText('⚡ How to Play')).toBeInTheDocument();
      expect(screen.getByText(/Bet tokens/)).toBeInTheDocument();
    });
  });

  describe('Settings', () => {
    it('should update rounds setting', async () => {
      const user = userEvent.setup();
      const session = createMockSession();

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      // Find rounds select and change it
      const roundsSelect = screen.getByDisplayValue('10 rounds');
      await user.selectOptions(roundsSelect, '15');

      expect(mockOnUpdateSettings).toHaveBeenCalledWith({ totalRounds: 15 });
    });

    it('should update time to read question setting', async () => {
      const user = userEvent.setup();
      const session = createMockSession();

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      // Find all selects and pick the second one (time between questions)
      const allSelects = screen.getAllByRole('combobox');
      const timeBetweenSelect = allSelects[1]; // Second select is time between questions
      await user.selectOptions(timeBetweenSelect, '7');

      expect(mockOnUpdateSettings).toHaveBeenCalledWith({ timeBetweenQuestions: 7 });
    });

    it('should update time to answer setting', async () => {
      const user = userEvent.setup();
      const session = createMockSession();

      render(
        <Lobby
          session={session}
          currentPlayer={session.players[0]}
          isHost={true}
          onStartGame={mockOnStartGame}
          onInviteFriends={mockOnInviteFriends}
          onUpdateSettings={mockOnUpdateSettings}
        />
      );

      // Find all selects and pick the third one (time to answer)
      const allSelects = screen.getAllByRole('combobox');
      const answerTimeSelect = allSelects[2]; // Third select is time to answer
      await user.selectOptions(answerTimeSelect, '15');

      expect(mockOnUpdateSettings).toHaveBeenCalledWith({ timeToAnswer: 15 });
    });
  });
});
