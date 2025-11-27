import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameSession, DiscordUser } from '../types/game';

interface SocketResponse {
  error?: string;
  session?: GameSession;
  [key: string]: unknown;
}

// Use relative URL to leverage Vite proxy in dev, or direct URL in production
const API_BASE = import.meta.env.VITE_API_URL || '';

interface UseGameEventsProps {
  channelId: string | null;
  playerId: string | null;
  onUpdate?: (session: GameSession) => void;
  initialSession?: GameSession | null;
  guildId?: string;
  instanceId?: string;
  user?: DiscordUser;
  platform?: 'discord' | 'browser';
  // Increment this to force socket reconnection (e.g., after exit game)
  reconnectKey?: number;
}

export function useGameEvents({ 
  channelId, 
  playerId, 
  onUpdate, 
  initialSession,
  guildId = '',
  instanceId = '',
  user,
  platform = 'discord',
  reconnectKey = 0
}: UseGameEventsProps) {
  // Initialize session from initialSession prop
  const [session, setSession] = useState<GameSession | null>(initialSession ?? null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const lastUpdateTimeRef = useRef<number>(initialSession?.lastActivity || 0);
  const hasJoinedRef = useRef(false);
  // Track if we've already exited to prevent double-leave in cleanup
  const hasExitedRef = useRef(false);

  // Log when component initializes with a session
  useEffect(() => {
    if (initialSession) {
      console.log('🎮 Initialized with session:', initialSession);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Update session when initialSession prop changes (Fix #4: use timestamp comparison)
  useEffect(() => {
    if (initialSession) {
      const incomingTimestamp = initialSession.lastActivity || 0;
      // Only update if initialSession is newer than current session
      if (incomingTimestamp >= lastUpdateTimeRef.current) {
        console.log('🔄 Updating session from initialSession prop:', initialSession);
        setSession(initialSession);
        lastUpdateTimeRef.current = incomingTimestamp;
      } else {
        console.log('⏭️ Skipping stale initialSession:', {
          incoming: incomingTimestamp,
          current: lastUpdateTimeRef.current
        });
      }
    } else if (initialSession === null) {
      // Explicitly clear session and reset timestamp when initialSession is set to null
      // This handles the "exit game" flow where we want to start fresh
      console.log('🧹 Clearing session state (initialSession set to null)');
      setSession(null);
      lastUpdateTimeRef.current = 0;
    }
  }, [initialSession]);

  useEffect(() => {
    if (!channelId || !playerId) {
      console.log('⏸️ Socket not connecting: missing channelId or playerId', { channelId, playerId });
      // Reset connection state but don't clear session - it may come from initialSession
      setIsConnected(false);
      // Reset hasJoinedRef so next connection can join fresh
      hasJoinedRef.current = false;
      return;
    }

    console.log('🔌 Connecting to Socket.IO...');
    const socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;
    hasJoinedRef.current = false;
    hasExitedRef.current = false; // Reset exit flag for new connection

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
      setIsConnected(true);
      setError(null);

      // Auto-join the game session after connecting (if we have user data)
      if (user && !hasJoinedRef.current) {
        console.log('🎮 Auto-joining game session via Socket.IO...');
        hasJoinedRef.current = true;
        
        socket.emit('game:join', {
          channelId,
          guildId,
          instanceId,
          user,
          platform,
        }, (response: SocketResponse) => {
          if (response.error) {
            console.error('❌ Failed to join game:', response.error);
            setError(response.error);
          } else if (response.session) {
            console.log('✅ Joined game successfully:', response);
            setSession(response.session);
            lastUpdateTimeRef.current = response.session.lastActivity || 0;
          }
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      setIsConnected(false);
      hasJoinedRef.current = false;
      if (reason === 'io server disconnect') {
        // Server disconnected, manually reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket.IO connection error:', err);
      setError('Connection error. Reconnecting...');
    });

    // Listen for game updates
    socket.on('game:update', (data: { type: string; session: GameSession; timestamp: number }) => {
      console.log('📨 Game update received:', data.type, data);
      
      const incomingTimestamp = data.session.lastActivity || 0;
      const currentTimestamp = lastUpdateTimeRef.current;
      
      // Only update if incoming data is newer than what we have
      if (incomingTimestamp >= currentTimestamp) {
        console.log('🎮 Updating session from', data.type);
        
        // For settings_changed events, only update if settings actually differ
        // This prevents unnecessary re-renders during optimistic updates
        if (data.type === 'settings_changed') {
          setSession(prev => {
            if (!prev) return data.session;
            
            // Check if settings actually changed
            const prevSettings = prev.settings;
            const newSettings = data.session.settings;
            const settingsChanged = 
              prevSettings.totalRounds !== newSettings.totalRounds ||
              prevSettings.timeBetweenQuestions !== newSettings.timeBetweenQuestions ||
              prevSettings.timeToAnswer !== newSettings.timeToAnswer ||
              prevSettings.timeToViewAnswer !== newSettings.timeToViewAnswer ||
              prevSettings.allowMidGameJoin !== newSettings.allowMidGameJoin;
            
            if (!settingsChanged) {
              console.log('⏭️ Skipping settings update - no actual changes');
              return prev; // Return same reference to prevent re-render
            }
            
            return data.session;
          });
        } else {
          setSession(data.session);
        }
        
        lastUpdateTimeRef.current = incomingTimestamp;
        onUpdate?.(data.session);
      } else {
        console.log('⏭️ Skipping stale update:', {
          incoming: incomingTimestamp,
          current: currentTimestamp,
          diff: currentTimestamp - incomingTimestamp
        });
      }
    });

    return () => {
      console.log('🔌 Closing Socket.IO connection');
      
      // Leave the game before disconnecting (unless we already exited via API)
      if (hasJoinedRef.current && !hasExitedRef.current) {
        socket.emit('game:leave', { channelId, playerId }, () => {
          console.log('👋 Left game session');
        });
      }
      
      socket.disconnect();
      socketRef.current = null;
    };
  }, [channelId, playerId, user, guildId, instanceId, platform, onUpdate, reconnectKey]);

  // Mark as exited when the exitGame API is used (called by useGameApi)
  const markAsExited = () => {
    hasExitedRef.current = true;
  };

  return { session, isConnected, error, socket: socketRef.current, markAsExited };
}

// API helper functions using Socket.IO
export function useGameApi(channelId: string | null, socket: Socket | null) {
  const [isLoading, setIsLoading] = useState(false);

  const socketEmit = async (event: string, data: Record<string, unknown>): Promise<SocketResponse> => {
    if (!socket || !socket.connected) {
      console.error('❌ Socket not connected');
      throw new Error('Socket not connected');
    }

    console.log(`📤 Emitting ${event}:`, { channelId, ...data });
    setIsLoading(true);

    return new Promise((resolve, reject) => {
      socket.emit(event, { channelId, ...data }, (response: SocketResponse) => {
        setIsLoading(false);
        if (response.error) {
          console.error(`❌ Error from ${event}:`, response.error);
          reject(new Error(response.error));
        } else {
          console.log(`✅ Response from ${event}:`, response);
          resolve(response);
        }
      });
    });
  };

  return {
    isLoading,
    startGame: (hostId: string) => socketEmit('game:start', { hostId }),
    submitVote: (playerId: string, answer: number | boolean, token: number) => 
      socketEmit('game:vote', { playerId, answer, token }),
    autoVote: (playerId: string) => socketEmit('game:auto_vote', { playerId }),
    changePhase: (hostId: string, phase: string) => 
      socketEmit('game:change_phase', { hostId, phase }),
    resetGame: (hostId: string) => socketEmit('game:reset', { hostId }),
    playAgain: (hostId: string) => socketEmit('game:play_again', { hostId }),
    updateSettings: (hostId: string, settings: Record<string, unknown>) =>
      socketEmit('game:update_settings', { hostId, settings }),
    transferHost: (currentHostId: string, newHostId: string) =>
      socketEmit('game:transfer_host', { currentHostId, newHostId }),
    exitGame: (playerId: string) => socketEmit('game:exit', { playerId }),
    cancelGeneration: (hostId: string) => socketEmit('game:cancel_generation', { hostId }),
  };
}
