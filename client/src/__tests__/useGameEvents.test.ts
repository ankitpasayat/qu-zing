import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameEvents } from '../hooks/useGameEvents';
import type { GameSession, DiscordUser } from '../types/game';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  id: 'test-socket-id',
  connected: true,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

function createMockSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    channelId: 'channel-123',
    guildId: 'guild-123',
    instanceId: 'instance-123',
    hostId: '123456789012345678',
    players: [],
    spectators: [],
    votes: [],
    currentPhase: 'lobby',
    currentRound: 0,
    totalRounds: 5,
    currentQuestion: null,
    questionHistory: [],
    isGeneratingQuestions: false,
    settings: {
      totalRounds: 5,
      timeToAnswer: 30,
      timeBetweenQuestions: 5,
      timeToViewAnswer: 5,
      categories: [],
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

const createMockUser = (): DiscordUser => ({
  id: '123456789012345678',
  username: 'TestUser',
  discriminator: '0',
  avatar: null,
  globalName: 'Test User',
});

describe('useGameEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockReset();
    mockSocket.emit.mockReset();
    mockSocket.disconnect.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not connect socket when channelId is null', () => {
    const { result } = renderHook(() =>
      useGameEvents({
        channelId: null,
        playerId: 'player-1',
      })
    );

    expect(result.current.session).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should not connect socket when playerId is null', () => {
    const { result } = renderHook(() =>
      useGameEvents({
        channelId: 'channel-123',
        playerId: null,
      })
    );

    expect(result.current.session).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should initialize with initialSession', () => {
    const mockSession = createMockSession();

    const { result } = renderHook(() =>
      useGameEvents({
        channelId: null,
        playerId: null,
        initialSession: mockSession,
      })
    );

    expect(result.current.session).toEqual(mockSession);
  });

  it('should connect to socket when channelId and playerId are provided', async () => {
    const { io } = await import('socket.io-client');

    renderHook(() =>
      useGameEvents({
        channelId: 'channel-123',
        playerId: 'player-1',
        user: createMockUser(),
      })
    );

    expect(io).toHaveBeenCalled();
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('game:update', expect.any(Function));
  });

  it('should handle connect event and join game', async () => {
    const mockUser = createMockUser();
    const mockSession = createMockSession();

    // Setup mock to capture the connect handler
    let connectHandler: () => void;
    mockSocket.on.mockImplementation((event: string, handler: () => void) => {
      if (event === 'connect') {
        connectHandler = handler;
      }
    });

    mockSocket.emit.mockImplementation(
      (_event: string, _data: unknown, callback: (response: unknown) => void) => {
        callback({ session: mockSession });
      }
    );

    const { result } = renderHook(() =>
      useGameEvents({
        channelId: 'channel-123',
        playerId: 'player-1',
        guildId: 'guild-123',
        instanceId: 'instance-123',
        user: mockUser,
        platform: 'browser',
      })
    );

    // Simulate connect event
    await act(async () => {
      connectHandler!();
    });

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSession);
    });

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'game:join',
        expect.objectContaining({
          channelId: 'channel-123',
          guildId: 'guild-123',
          instanceId: 'instance-123',
          user: mockUser,
          platform: 'browser',
        }),
        expect.any(Function)
      );
    });
  });

  it('should handle disconnect event', async () => {
    let disconnectHandler: (reason: string) => void;
    mockSocket.on.mockImplementation((event: string, handler: (reason: string) => void) => {
      if (event === 'disconnect') {
        disconnectHandler = handler;
      }
    });

    const { result } = renderHook(() =>
      useGameEvents({
        channelId: 'channel-123',
        playerId: 'player-1',
      })
    );

    // Simulate disconnect
    await act(async () => {
      disconnectHandler!('transport close');
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should handle server-initiated disconnect and reconnect', async () => {
    let disconnectHandler: (reason: string) => void;
    mockSocket.on.mockImplementation((event: string, handler: (reason: string) => void) => {
      if (event === 'disconnect') {
        disconnectHandler = handler;
      }
    });

    renderHook(() =>
      useGameEvents({
        channelId: 'channel-123',
        playerId: 'player-1',
      })
    );

    // Simulate server disconnect
    await act(async () => {
      disconnectHandler!('io server disconnect');
    });

    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('should handle connect_error event', async () => {
    let errorHandler: (err: Error) => void;
    mockSocket.on.mockImplementation((event: string, handler: (err: Error) => void) => {
      if (event === 'connect_error') {
        errorHandler = handler;
      }
    });

    const { result } = renderHook(() =>
      useGameEvents({
        channelId: 'channel-123',
        playerId: 'player-1',
      })
    );

    // Simulate connection error - this sets error state internally
    await act(async () => {
      errorHandler!(new Error('Connection failed'));
    });

    expect(result.current.error).toBe('Connection error. Reconnecting...');
  });

  it('should handle game:update event with newer data', async () => {
    const initialSession = createMockSession({ lastActivity: 1000 });
    const updatedSession = createMockSession({ lastActivity: 2000, currentRound: 1 });

    let updateHandler: (data: { type: string; session: GameSession; timestamp: number }) => void;
    mockSocket.on.mockImplementation((event: string, handler: (data: unknown) => void) => {
      if (event === 'game:update') {
        updateHandler = handler as typeof updateHandler;
      }
    });

    const onUpdate = vi.fn();
    const { result } = renderHook(() =>
      useGameEvents({
        channelId: 'channel-123',
        playerId: 'player-1',
        initialSession,
        onUpdate,
      })
    );

    // Simulate game update
    await act(async () => {
      updateHandler!({ type: 'round_start', session: updatedSession, timestamp: Date.now() });
    });

    expect(result.current.session?.currentRound).toBe(1);
    expect(onUpdate).toHaveBeenCalledWith(updatedSession);
  });

  it('should ignore stale game:update events', async () => {
    const initialSession = createMockSession({ lastActivity: 2000 });
    const staleSession = createMockSession({ lastActivity: 1000, currentRound: 5 });

    let updateHandler: (data: { type: string; session: GameSession; timestamp: number }) => void;
    mockSocket.on.mockImplementation((event: string, handler: (data: unknown) => void) => {
      if (event === 'game:update') {
        updateHandler = handler as typeof updateHandler;
      }
    });

    const onUpdate = vi.fn();
    const { result } = renderHook(() =>
      useGameEvents({
        channelId: 'channel-123',
        playerId: 'player-1',
        initialSession,
        onUpdate,
      })
    );

    // Simulate stale game update
    await act(async () => {
      updateHandler!({ type: 'stale_update', session: staleSession, timestamp: Date.now() });
    });

    // Session should remain unchanged
    expect(result.current.session?.currentRound).toBe(0);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('should update session when initialSession prop changes with newer data', () => {
    const session1 = createMockSession({ lastActivity: 1000 });
    const session2 = createMockSession({ lastActivity: 2000, currentRound: 1 });

    const { result, rerender } = renderHook(
      ({ initialSession }) =>
        useGameEvents({
          channelId: null,
          playerId: null,
          initialSession,
        }),
      { initialProps: { initialSession: session1 } }
    );

    expect(result.current.session?.currentRound).toBe(0);

    // Update with newer session
    rerender({ initialSession: session2 });

    expect(result.current.session?.currentRound).toBe(1);
  });

  it('should disconnect and leave game on unmount', async () => {
    let connectHandler: () => void;
    mockSocket.on.mockImplementation((event: string, handler: () => void) => {
      if (event === 'connect') {
        connectHandler = handler;
      }
    });

    mockSocket.emit.mockImplementation(
      (_event: string, _data: unknown, callback?: (response: unknown) => void) => {
        if (callback) {
          callback({ session: createMockSession() });
        }
      }
    );

    const { unmount } = renderHook(() =>
      useGameEvents({
        channelId: 'channel-123',
        playerId: 'player-1',
        user: createMockUser(),
      })
    );

    // Simulate connect to set hasJoined
    await act(async () => {
      connectHandler!();
    });

    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:leave',
      { channelId: 'channel-123', playerId: 'player-1' },
      expect.any(Function)
    );
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should handle join error', async () => {
    let connectHandler: () => void;
    mockSocket.on.mockImplementation((event: string, handler: () => void) => {
      if (event === 'connect') {
        connectHandler = handler;
      }
    });

    mockSocket.emit.mockImplementation(
      (_event: string, _data: unknown, callback: (response: unknown) => void) => {
        callback({ error: 'Game not found' });
      }
    );

    const { result } = renderHook(() =>
      useGameEvents({
        channelId: 'channel-123',
        playerId: 'player-1',
        user: createMockUser(),
      })
    );

    // Simulate connect
    await act(async () => {
      connectHandler!();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Game not found');
    });
  });

  it('should return socket reference', () => {
    const { result } = renderHook(() =>
      useGameEvents({
        channelId: 'channel-123',
        playerId: 'player-1',
      })
    );

    expect(result.current.socket).toBeDefined();
  });
});
