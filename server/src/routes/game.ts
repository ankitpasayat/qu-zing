import express from 'express';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { 
  getOrCreateSession,
  disconnectPlayer,
  removePlayer,
  transferHost,
  updateSettings,
  startGame, 
  submitVote,
  autoVote,
  changePhase,
  resetGame,
  playAgain,
  exitGame,
  cancelGeneration,
  activateGambit,
  tradeTokensUp,
  tradeTokensDown,
  get5050Options
} from '../lib/game-manager.js';
import type { DiscordUser, GameSettings, GamePhase, PowerUpType } from '../types/game.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

// Track socket connections - playerId -> socketId mapping
const playerSockets = new Map<string, string>();
const socketPlayers = new Map<string, { playerId: string; channelId: string }>();

// Helper to broadcast updates to all clients in a channel using Socket.IO
export function broadcastUpdate(io: SocketIOServer, channelId: string, eventType: string, session: unknown) {
  logger.info(`Broadcasting ${eventType} to room ${channelId}`);
  io.to(channelId).emit('game:update', { type: eventType, session, timestamp: Date.now() });
}

// Setup Socket.IO event handlers
export function setupSocketIO(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join a game session
    socket.on('game:join', async (data: {
      channelId: string;
      guildId: string;
      instanceId: string;
      user: DiscordUser;
      platform: 'discord' | 'browser';
    }, callback) => {
      try {
        const { channelId, guildId, instanceId, user, platform } = data;

        if (!channelId || !user) {
          callback({ error: 'Missing channelId or user' });
          return;
        }

        const { session, player, isNewSession } = getOrCreateSession(
          channelId, 
          guildId || '', 
          instanceId || '', 
          user,
          platform || 'discord'
        );

        // Join the socket room
        socket.join(channelId);
        
        // Track player-socket mapping
        playerSockets.set(player.id, socket.id);
        socketPlayers.set(socket.id, { playerId: player.id, channelId });

        // Send success response
        callback({ success: true, session, playerId: player.id, isNewSession });

        // Broadcast to all players in the room
        if (isNewSession) {
          broadcastUpdate(io, channelId, 'session_created', session);
        } else {
          broadcastUpdate(io, channelId, 'player_joined', session);
        }

        logger.info(`Player ${user.username} joined channel ${channelId}`);
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:join:', error);
        callback({ error: 'Failed to join session' });
      }
    });

    // Leave a session
    socket.on('game:leave', (data: { channelId: string; playerId: string }, callback) => {
      try {
        const { channelId, playerId } = data;
        const session = removePlayer(channelId, playerId);
        
        if (session) {
          broadcastUpdate(io, channelId, 'player_left', session);
        }

        // Clean up tracking
        playerSockets.delete(playerId);
        socketPlayers.delete(socket.id);
        socket.leave(channelId);
        
        callback({ success: true });
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:leave:', error);
        callback({ error: 'Failed to leave session' });
      }
    });

    // Transfer host
    socket.on('game:transfer_host', (data: { channelId: string; currentHostId: string; newHostId: string }, callback) => {
      try {
        const { channelId, currentHostId, newHostId } = data;
        const session = transferHost(channelId, currentHostId, newHostId);
        
        if (!session) {
          callback({ error: 'Failed to transfer host' });
          return;
        }

        broadcastUpdate(io, channelId, 'host_changed', session);
        callback({ success: true, session });
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:transfer_host:', error);
        callback({ error: 'Failed to transfer host' });
      }
    });

    // Update settings
    socket.on('game:update_settings', (data: {
      channelId: string;
      hostId: string;
      settings: Partial<GameSettings>;
    }, callback) => {
      try {
        const { channelId, hostId, settings } = data;
        const session = updateSettings(channelId, hostId, settings);
        
        if (!session) {
          callback({ error: 'Failed to update settings' });
          return;
        }

        broadcastUpdate(io, channelId, 'settings_changed', session);
        callback({ success: true, session });
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:update_settings:', error);
        callback({ error: 'Failed to update settings' });
      }
    });

    // Start game
    socket.on('game:start', async (data: { channelId: string; hostId: string }, callback) => {
      try {
        const { channelId, hostId } = data;
        logger.info(`Start game request: channelId=${channelId}, hostId=${hostId}`);
        
        // Create broadcast function that uses Socket.IO
        const broadcast = (ch: string, type: string, sess: unknown) => {
          broadcastUpdate(io, ch, type, sess);
        };

        const session = await startGame(channelId, hostId, broadcast);
        
        if (!session) {
          logger.warn(`Failed to start game: channelId=${channelId}, hostId=${hostId}`);
          callback({ error: 'Failed to start game' });
          return;
        }

        broadcastUpdate(io, channelId, 'game_started', session);
        callback({ success: true, session });
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:start:', error);
        callback({ error: 'Failed to start game' });
      }
    });

    // Submit vote
    socket.on('game:vote', (data: {
      channelId: string;
      playerId: string;
      answer: number | boolean;
      token: number;
      powerUpUsed?: PowerUpType | null;
      eliminatedOptions?: number[] | null;
    }, callback) => {
      try {
        const { channelId, playerId, answer, token, powerUpUsed, eliminatedOptions } = data;
        const session = submitVote(channelId, playerId, answer, token, powerUpUsed || null, eliminatedOptions || null);
        
        if (!session) {
          callback({ error: 'Failed to submit vote' });
          return;
        }

        broadcastUpdate(io, channelId, 'vote_submitted', session);
        callback({ success: true, session });
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:vote:', error);
        callback({ error: 'Failed to submit vote' });
      }
    });

    // Auto-submit vote
    socket.on('game:auto_vote', (data: { channelId: string; playerId: string }, callback) => {
      try {
        const { channelId, playerId } = data;
        const session = autoVote(channelId, playerId);
        
        if (!session) {
          callback({ error: 'Failed to auto-submit vote' });
          return;
        }

        broadcastUpdate(io, channelId, 'auto_vote_submitted', session);
        callback({ success: true, session });
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:auto_vote:', error);
        callback({ error: 'Failed to auto-submit vote' });
      }
    });

    // Change phase
    socket.on('game:change_phase', (data: {
      channelId: string;
      hostId: string;
      phase: GamePhase;
    }, callback) => {
      try {
        const { channelId, hostId, phase } = data;
        const session = changePhase(channelId, hostId, phase);
        
        if (!session) {
          callback({ error: 'Failed to change phase' });
          return;
        }

        broadcastUpdate(io, channelId, 'phase_changed', session);
        callback({ success: true, session });
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:change_phase:', error);
        callback({ error: 'Failed to change phase' });
      }
    });

    // Reset game
    socket.on('game:reset', (data: { channelId: string; hostId: string }, callback) => {
      try {
        const { channelId, hostId } = data;
        const session = resetGame(channelId, hostId);
        
        if (!session) {
          callback({ error: 'Failed to reset game' });
          return;
        }

        broadcastUpdate(io, channelId, 'game_reset', session);
        callback({ success: true, session });
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:reset:', error);
        callback({ error: 'Failed to reset game' });
      }
    });

    // Play again (reset + start in one atomic operation)
    socket.on('game:play_again', async (data: { channelId: string; hostId: string }, callback) => {
      try {
        const { channelId, hostId } = data;
        logger.info(`Play again request: channelId=${channelId}, hostId=${hostId}`);
        
        // Create broadcast function that uses Socket.IO
        const broadcast = (ch: string, type: string, sess: unknown) => {
          broadcastUpdate(io, ch, type, sess);
        };

        const session = await playAgain(channelId, hostId, broadcast);
        
        if (!session) {
          logger.warn(`Failed to play again: channelId=${channelId}, hostId=${hostId}`);
          callback({ error: 'Failed to play again' });
          return;
        }

        broadcastUpdate(io, channelId, 'game_started', session);
        callback({ success: true, session });
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:play_again:', error);
        callback({ error: 'Failed to play again' });
      }
    });

    // Exit game (gracefully leave)
    socket.on('game:exit', (data: { channelId: string; playerId: string }, callback) => {
      try {
        const { channelId, playerId } = data;
        const { session, wasHost, newHostId } = exitGame(channelId, playerId);
        
        // Clean up socket tracking
        playerSockets.delete(playerId);
        socketPlayers.delete(socket.id);
        socket.leave(channelId);
        
        if (session) {
          // Single broadcast with exit info (includes host change if applicable)
          broadcastUpdate(io, channelId, wasHost && newHostId ? 'player_exited_host_changed' : 'player_exited', session);
        }
        
        callback({ success: true, wasLastPlayer: !session });
        logger.info(`Player ${playerId} gracefully exited from channel ${channelId}`);
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:exit:', error);
        callback({ error: 'Failed to exit game' });
      }
    });

    // Cancel question generation
    socket.on('game:cancel_generation', (data: { channelId: string; hostId: string }, callback) => {
      try {
        const { channelId, hostId } = data;
        const session = cancelGeneration(channelId, hostId);
        
        if (!session) {
          callback({ error: 'Failed to cancel generation' });
          return;
        }

        broadcastUpdate(io, channelId, 'generation_cancelled', session);
        callback({ success: true, session });
        logger.info(`Question generation cancelled by host in channel ${channelId}`);
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:cancel_generation:', error);
        callback({ error: 'Failed to cancel generation' });
      }
    });

    // Activate Endgame Gambit (The Trifecta)
    socket.on('game:activate_gambit', (data: { channelId: string; playerId: string }, callback) => {
      try {
        const { channelId, playerId } = data;
        const session = activateGambit(channelId, playerId);
        
        if (!session) {
          callback({ error: 'Failed to activate gambit' });
          return;
        }

        broadcastUpdate(io, channelId, 'gambit_activated', session);
        callback({ success: true, session });
        logger.info(`Gambit activated by player ${playerId} in channel ${channelId}`);
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:activate_gambit:', error);
        callback({ error: 'Failed to activate gambit' });
      }
    });

    // Trade tokens up (2 of N for 1 of N+1)
    socket.on('game:trade_up', (data: { channelId: string; playerId: string; sourceValue: number }, callback) => {
      try {
        const { channelId, playerId, sourceValue } = data;
        const session = tradeTokensUp(channelId, playerId, sourceValue);
        
        if (!session) {
          callback({ error: 'Failed to trade tokens' });
          return;
        }

        broadcastUpdate(io, channelId, 'tokens_traded', session);
        callback({ success: true, session });
        logger.info(`Player ${playerId} traded up tokens in channel ${channelId}`);
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:trade_up:', error);
        callback({ error: 'Failed to trade tokens' });
      }
    });

    // Trade tokens down (1 of N for 2 of floor(N/2))
    socket.on('game:trade_down', (data: { channelId: string; playerId: string; sourceValue: number }, callback) => {
      try {
        const { channelId, playerId, sourceValue } = data;
        const session = tradeTokensDown(channelId, playerId, sourceValue);
        
        if (!session) {
          callback({ error: 'Failed to trade tokens' });
          return;
        }

        broadcastUpdate(io, channelId, 'tokens_traded', session);
        callback({ success: true, session });
        logger.info(`Player ${playerId} traded down tokens in channel ${channelId}`);
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:trade_down:', error);
        callback({ error: 'Failed to trade tokens' });
      }
    });

    // Get 50/50 eliminated options
    socket.on('game:get_5050', (data: { channelId: string; playerId: string }, callback) => {
      try {
        const { channelId, playerId } = data;
        const eliminatedOptions = get5050Options(channelId, playerId);
        
        if (!eliminatedOptions) {
          callback({ error: 'Failed to get 50/50 options' });
          return;
        }

        callback({ success: true, eliminatedOptions });
        logger.info(`50/50 options generated for player ${playerId} in channel ${channelId}`);
      } catch (error) /* istanbul ignore next */ {
        logger.error('Error in game:get_5050:', error);
        callback({ error: 'Failed to get 50/50 options' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      
      const playerInfo = socketPlayers.get(socket.id);
      if (playerInfo) {
        const { playerId, channelId } = playerInfo;
        
        // Mark player as disconnected (don't remove - they might reconnect)
        const session = disconnectPlayer(channelId, playerId);
        if (session) {
          broadcastUpdate(io, channelId, 'player_disconnected', session);
        }
        
        // Clean up tracking
        playerSockets.delete(playerId);
        socketPlayers.delete(socket.id);
        
        logger.info(`Player ${playerId} disconnected from channel ${channelId}`);
      }
    });
  });

  logger.info('Socket.IO handlers initialized');
}

// Keep REST endpoint for initial join (backward compatibility)
// This can be used for initial connection before Socket.IO is established
router.post('/join', (req, res) => {
  try {
    const { channelId, guildId, instanceId, user, platform } = req.body as {
      channelId: string;
      guildId: string;
      instanceId: string;
      user: DiscordUser;
      platform: 'discord' | 'browser';
    };

    if (!channelId || !user) {
      return res.status(400).json({ error: 'Missing channelId or user' });
    }

    const { session, player, isNewSession } = getOrCreateSession(
      channelId, 
      guildId || '', 
      instanceId || '', 
      user,
      platform || 'discord'
    );
    
    res.json({ success: true, session, playerId: player.id, isNewSession });
  } catch (error) /* istanbul ignore next */ {
    logger.error('Error joining session:', error);
    res.status(500).json({ error: 'Failed to join session' });
  }
});



export default router;
