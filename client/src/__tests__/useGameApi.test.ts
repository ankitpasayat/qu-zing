import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameApi } from '../hooks/useGameEvents';
import type { GameSession } from '../types/game';
import type { Socket } from 'socket.io-client';

function createMockSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    channelId: 'channel-123',
    guildId: 'guild-123',
    instanceId: 'instance-123',
    hostId: 'player-1',
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

describe('useGameApi', () => {
  const createMockSocket = (connected = true) => ({
    connected,
    emit: vi.fn(),
  }) as unknown as Socket;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when socket is null', async () => {
    const { result } = renderHook(() => useGameApi('channel-123', null));
    
    await expect(result.current.startGame('host-1')).rejects.toThrow('Socket not connected');
  });

  it('throws error when socket is disconnected', async () => {
    const disconnectedSocket = createMockSocket(false);
    const { result } = renderHook(() => useGameApi('channel-123', disconnectedSocket));
    
    await expect(result.current.startGame('host-1')).rejects.toThrow('Socket not connected');
  });

  it('emits startGame event', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ session: createMockSession() });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await act(async () => {
      await result.current.startGame('host-1');
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:start',
      { channelId: 'channel-123', hostId: 'host-1' },
      expect.any(Function)
    );
  });

  it('emits submitVote event', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ session: createMockSession() });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await act(async () => {
      await result.current.submitVote('player-1', 2, 5);
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:vote',
      { channelId: 'channel-123', playerId: 'player-1', answer: 2, token: 5 },
      expect.any(Function)
    );
  });

  it('emits changePhase event', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ session: createMockSession() });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await act(async () => {
      await result.current.changePhase('host-1', 'voting');
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:change_phase',
      { channelId: 'channel-123', hostId: 'host-1', phase: 'voting' },
      expect.any(Function)
    );
  });

  it('emits resetGame event', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ session: createMockSession() });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await act(async () => {
      await result.current.resetGame('host-1');
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:reset',
      { channelId: 'channel-123', hostId: 'host-1' },
      expect.any(Function)
    );
  });

  it('emits playAgain event', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ session: createMockSession({ currentPhase: 'question', currentRound: 1 }) });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await act(async () => {
      await result.current.playAgain('host-1');
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:play_again',
      { channelId: 'channel-123', hostId: 'host-1' },
      expect.any(Function)
    );
  });

  it('emits exitGame event', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ session: createMockSession() });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await act(async () => {
      await result.current.exitGame('player-1');
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:exit',
      { channelId: 'channel-123', playerId: 'player-1' },
      expect.any(Function)
    );
  });

  it('handles error response', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ error: 'Game not found' });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await expect(result.current.startGame('host-1')).rejects.toThrow('Game not found');
  });

  it('emits autoVote event', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ session: createMockSession() });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await act(async () => {
      await result.current.autoVote('player-1');
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:auto_vote',
      { channelId: 'channel-123', playerId: 'player-1' },
      expect.any(Function)
    );
  });

  it('emits updateSettings event', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ session: createMockSession() });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await act(async () => {
      await result.current.updateSettings('host-1', { totalRounds: 15 });
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:update_settings',
      { channelId: 'channel-123', hostId: 'host-1', settings: { totalRounds: 15 } },
      expect.any(Function)
    );
  });

  it('emits transferHost event', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ session: createMockSession() });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await act(async () => {
      await result.current.transferHost('host-1', 'new-host-2');
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:transfer_host',
      { channelId: 'channel-123', currentHostId: 'host-1', newHostId: 'new-host-2' },
      expect.any(Function)
    );
  });

  it('emits cancelGeneration event', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ session: createMockSession() });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await act(async () => {
      await result.current.cancelGeneration('host-1');
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:cancel_generation',
      { channelId: 'channel-123', hostId: 'host-1' },
      expect.any(Function)
    );
  });

  it('sets isLoading correctly during API calls', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        // Immediately call callback
        callback({ session: createMockSession() });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    // Initially not loading
    expect(result.current.isLoading).toBe(false);
    
    // Make a call
    await act(async () => {
      await result.current.startGame('host-1');
    });
    
    // After completion, should not be loading
    expect(result.current.isLoading).toBe(false);
  });

  it('supports boolean answer in submitVote', async () => {
    const mockSocket = createMockSocket();
    (mockSocket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event, _data, callback) => {
        callback({ session: createMockSession() });
      }
    );
    
    const { result } = renderHook(() => useGameApi('channel-123', mockSocket));
    
    await act(async () => {
      await result.current.submitVote('player-1', true, 5);
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'game:vote',
      { channelId: 'channel-123', playerId: 'player-1', answer: true, token: 5 },
      expect.any(Function)
    );
  });
});
