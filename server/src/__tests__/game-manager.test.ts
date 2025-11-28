import {
  getOrCreateSession,
  getSession,
  removePlayer,
  disconnectPlayer,
  exitGame,
  transferHost,
  updateSettings,
  startGame,
  submitVote,
  autoVote,
  changePhase,
  resetGame,
  playAgain,
  cleanupInactiveSessions,
  getAnalytics,
  cancelGeneration,
  activateGambit,
  tradeTokensUp,
  tradeTokensDown,
  get5050Options,
} from '../lib/game-manager.js';
import type { DiscordUser } from '../types/game.js';

// Helper to create test users
const createUser = (id: string, username: string = 'TestUser'): DiscordUser => ({
  id,
  username,
  discriminator: '0',
  avatar: null,
  globalName: username,
  platform: 'browser',
});

// Helper to get unique channel IDs for each test
const getUniqueChannelId = () => `channel-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe('GameManager', () => {
  describe('getOrCreateSession', () => {
    it('should create a new session when none exists', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1', 'Player1');
      
      const { session, player, isNewSession } = getOrCreateSession(
        channelId, '', '', user, 'browser'
      );
      
      expect(isNewSession).toBe(true);
      expect(session.channelId).toBe(channelId);
      expect(session.platform).toBe('browser');
      expect(session.hostId).toBe(user.id);
      expect(session.players).toHaveLength(1);
      expect(player.id).toBe(user.id);
      expect(player.isHost).toBe(true);
      expect(session.currentPhase).toBe('lobby'); // Auto-transitions from waiting
    });

    it('should return existing session for same channel', () => {
      const channelId = getUniqueChannelId();
      const user1 = createUser('user1', 'Player1');
      const user2 = createUser('user2', 'Player2');
      
      const _result1 = getOrCreateSession(channelId, '', '', user1, 'browser');
      const result2 = getOrCreateSession(channelId, '', '', user2, 'browser');
      
      expect(result2.isNewSession).toBe(false);
      expect(result2.session.players).toHaveLength(2);
      expect(result2.player.isHost).toBe(false);
    });

    it('should handle player reconnection', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1', 'Player1');
      
      const result1 = getOrCreateSession(channelId, '', '', user, 'browser');
      result1.player.isConnected = false;
      
      const result2 = getOrCreateSession(channelId, '', '', user, 'browser');
      
      expect(result2.player.isConnected).toBe(true);
      expect(result2.session.players).toHaveLength(1); // Same player, not duplicated
    });

    it('should add player as spectator when game is in progress', () => {
      const channelId = getUniqueChannelId();
      const host = createUser('host', 'Host');
      const latecomer = createUser('latecomer', 'Latecomer');
      
      const { session } = getOrCreateSession(channelId, '', '', host, 'browser');
      // Simulate game in progress
      session.currentPhase = 'question';
      
      const { player, session: updatedSession } = getOrCreateSession(
        channelId, '', '', latecomer, 'browser'
      );
      
      expect(player.isSpectator).toBe(true);
      expect(updatedSession.spectators).toHaveLength(1);
      expect(updatedSession.players).toHaveLength(1);
    });

    it('should set Discord platform correctly', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1', 'Player1');
      
      const { session } = getOrCreateSession(
        channelId, 'guild123', 'instance456', user, 'discord'
      );
      
      expect(session.platform).toBe('discord');
      expect(session.guildId).toBe('guild123');
      expect(session.instanceId).toBe('instance456');
    });
  });

  describe('getSession', () => {
    it('should return session when exists', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      getOrCreateSession(channelId, '', '', user, 'browser');
      
      const session = getSession(channelId);
      expect(session).not.toBeNull();
      expect(session?.channelId).toBe(channelId);
    });

    it('should return null when session does not exist', () => {
      const session = getSession('nonexistent-channel');
      expect(session).toBeNull();
    });
  });

  describe('removePlayer', () => {
    it('should remove player from session', () => {
      const channelId = getUniqueChannelId();
      const user1 = createUser('user1');
      const user2 = createUser('user2');
      
      getOrCreateSession(channelId, '', '', user1, 'browser');
      getOrCreateSession(channelId, '', '', user2, 'browser');
      
      const session = removePlayer(channelId, 'user1');
      
      expect(session?.players).toHaveLength(1);
      expect(session?.players[0].id).toBe('user2');
    });

    it('should transfer host when host is removed', () => {
      const channelId = getUniqueChannelId();
      const host = createUser('host');
      const player2 = createUser('player2');
      
      getOrCreateSession(channelId, '', '', host, 'browser');
      getOrCreateSession(channelId, '', '', player2, 'browser');
      
      const session = removePlayer(channelId, 'host');
      
      expect(session?.hostId).toBe('player2');
      expect(session?.players[0].isHost).toBe(true);
    });

    it('should delete session when last player leaves', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      const result = removePlayer(channelId, 'user1');
      
      expect(result).toBeNull();
      expect(getSession(channelId)).toBeNull();
    });

    it('should return null for nonexistent session', () => {
      const result = removePlayer('nonexistent', 'user1');
      expect(result).toBeNull();
    });
  });

  describe('disconnectPlayer', () => {
    it('should mark player as disconnected', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      const session = disconnectPlayer(channelId, 'user1');
      
      expect(session?.players[0].isConnected).toBe(false);
    });

    it('should return null for nonexistent session', () => {
      const result = disconnectPlayer('nonexistent', 'user1');
      expect(result).toBeNull();
    });

    it('should handle disconnecting nonexistent player gracefully', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      // Disconnect a player that doesn't exist in the session
      const session = disconnectPlayer(channelId, 'nonexistent-player');
      
      // Should still return session but player not found
      expect(session).not.toBeNull();
      expect(session?.players[0].isConnected).toBe(true); // Original player unchanged
    });
  });

  describe('exitGame', () => {
    it('should remove player and return exit info', () => {
      const channelId = getUniqueChannelId();
      const user1 = createUser('user1');
      const user2 = createUser('user2');
      
      getOrCreateSession(channelId, '', '', user1, 'browser');
      getOrCreateSession(channelId, '', '', user2, 'browser');
      
      const { session, wasHost, newHostId } = exitGame(channelId, 'user1');
      
      expect(session?.players).toHaveLength(1);
      expect(wasHost).toBe(true);
      expect(newHostId).toBe('user2');
    });

    it('should handle non-host exit', () => {
      const channelId = getUniqueChannelId();
      const user1 = createUser('user1');
      const user2 = createUser('user2');
      
      getOrCreateSession(channelId, '', '', user1, 'browser');
      getOrCreateSession(channelId, '', '', user2, 'browser');
      
      const { session, wasHost, newHostId } = exitGame(channelId, 'user2');
      
      expect(session?.players).toHaveLength(1);
      expect(wasHost).toBe(false);
      expect(newHostId).toBeNull();
    });

    it('should remove player vote when exiting during voting', () => {
      const channelId = getUniqueChannelId();
      const user1 = createUser('user1');
      const user2 = createUser('user2');
      
      const { session } = getOrCreateSession(channelId, '', '', user1, 'browser');
      getOrCreateSession(channelId, '', '', user2, 'browser');
      
      // Simulate voting phase
      session.currentPhase = 'voting';
      session.votes = [
        { playerId: 'user1', answer: 0, token: 5, submittedAt: Date.now(), powerUpUsed: null, eliminatedOptions: null },
        { playerId: 'user2', answer: 1, token: 3, submittedAt: Date.now(), powerUpUsed: null, eliminatedOptions: null },
      ];
      
      const { session: updatedSession } = exitGame(channelId, 'user1');
      
      expect(updatedSession?.votes).toHaveLength(1);
      expect(updatedSession?.votes[0].playerId).toBe('user2');
    });

    it('should return null for nonexistent session', () => {
      const { session, wasHost, newHostId } = exitGame('nonexistent', 'user1');
      expect(session).toBeNull();
      expect(wasHost).toBe(false);
      expect(newHostId).toBeNull();
    });

    it('should return null for nonexistent player', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      
      const { session, wasHost, newHostId } = exitGame(channelId, 'nonexistent');
      expect(session).toBeNull();
      expect(wasHost).toBe(false);
      expect(newHostId).toBeNull();
    });
  });

  describe('transferHost', () => {
    it('should transfer host to another player', () => {
      const channelId = getUniqueChannelId();
      const user1 = createUser('user1');
      const user2 = createUser('user2');
      
      getOrCreateSession(channelId, '', '', user1, 'browser');
      getOrCreateSession(channelId, '', '', user2, 'browser');
      
      const session = transferHost(channelId, 'user1', 'user2');
      
      expect(session?.hostId).toBe('user2');
      expect(session?.players.find(p => p.id === 'user1')?.isHost).toBe(false);
      expect(session?.players.find(p => p.id === 'user2')?.isHost).toBe(true);
    });

    it('should return null for invalid host', () => {
      const channelId = getUniqueChannelId();
      const user1 = createUser('user1');
      const user2 = createUser('user2');
      
      getOrCreateSession(channelId, '', '', user1, 'browser');
      getOrCreateSession(channelId, '', '', user2, 'browser');
      
      const result = transferHost(channelId, 'user2', 'user1'); // user2 is not host
      expect(result).toBeNull();
    });

    it('should return null for nonexistent new host', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      
      const result = transferHost(channelId, 'user1', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateSettings', () => {
    it('should update game settings', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      
      const session = updateSettings(channelId, 'user1', {
        totalRounds: 15,
        timeToAnswer: 20,
      });
      
      expect(session?.settings.totalRounds).toBe(15);
      expect(session?.settings.timeToAnswer).toBe(20);
      expect(session?.settings.allowMidGameJoin).toBe(true); // Unchanged
    });

    it('should reject update from non-host', () => {
      const channelId = getUniqueChannelId();
      const user1 = createUser('user1');
      const user2 = createUser('user2');
      
      getOrCreateSession(channelId, '', '', user1, 'browser');
      getOrCreateSession(channelId, '', '', user2, 'browser');
      
      const result = updateSettings(channelId, 'user2', { totalRounds: 5 });
      expect(result).toBeNull();
    });

    it('should reject update when game in progress', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      const { session } = getOrCreateSession(channelId, '', '', user, 'browser');
      session.currentPhase = 'question';
      
      const result = updateSettings(channelId, 'user1', { totalRounds: 5 });
      expect(result).toBeNull();
    });

    it('should regenerate token counts when totalRounds changes', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      
      // Initially 10 rounds = 10 tokens (1 of each 1-10)
      let session = getSession(channelId)!;
      expect(Object.values(session.players[0].tokenCounts).reduce((a, b) => a + b, 0)).toBe(10);
      
      // Update to 15 rounds = 15 tokens
      session = updateSettings(channelId, 'user1', { totalRounds: 15 })!;
      const totalTokens = Object.values(session.players[0].tokenCounts).reduce((a, b) => a + b, 0);
      expect(totalTokens).toBe(15);
      
      // Check that high-value tokens got extra counts (10, 9, 8, 7, 6 should have 2 each)
      expect(session.players[0].tokenCounts[10]).toBe(2);
      expect(session.players[0].tokenCounts[9]).toBe(2);
      expect(session.players[0].tokenCounts[8]).toBe(2);
      expect(session.players[0].tokenCounts[7]).toBe(2);
      expect(session.players[0].tokenCounts[6]).toBe(2);
      expect(session.players[0].tokenCounts[5]).toBe(1);
    });
  });

  describe('startGame', () => {
    it('should fail when session does not exist', async () => {
      const result = await startGame('nonexistent', 'user1');
      expect(result).toBeNull();
    });

    it('should fail when not host', async () => {
      const channelId = getUniqueChannelId();
      const user1 = createUser('user1');
      const user2 = createUser('user2');
      
      getOrCreateSession(channelId, '', '', user1, 'browser');
      getOrCreateSession(channelId, '', '', user2, 'browser');
      
      const result = await startGame(channelId, 'user2');
      expect(result).toBeNull();
    });

    it('should fail when not in lobby phase', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      const { session } = getOrCreateSession(channelId, '', '', user, 'browser');
      session.currentPhase = 'question';
      
      const result = await startGame(channelId, 'user1');
      expect(result).toBeNull();
    });

    it('should start game successfully', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      
      const session = await startGame(channelId, 'user1');
      
      expect(session).not.toBeNull();
      expect(session?.currentPhase).toBe('question');
      expect(session?.currentRound).toBe(1);
      expect(session?.questionHistory.length).toBeGreaterThan(0);
      expect(session?.currentQuestion).not.toBeNull();
    });

    it('should broadcast generating status', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      const broadcastCalls: Array<{channel: string; type: string}> = [];
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      
      const broadcastFn = (ch: string, type: string) => {
        broadcastCalls.push({ channel: ch, type });
      };
      
      await startGame(channelId, 'user1', broadcastFn);
      
      expect(broadcastCalls.some(c => c.type === 'generating_questions')).toBe(true);
    });

    it('should regenerate tokens to match settings.totalRounds', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      
      // Change settings to 15 rounds
      updateSettings(channelId, 'user1', { totalRounds: 15 });
      
      const session = await startGame(channelId, 'user1');
      
      expect(session).not.toBeNull();
      // Total tokens should be 15
      const totalTokens = Object.values(session!.players[0].tokenCounts).reduce((a, b) => a + b, 0);
      expect(totalTokens).toBe(15);
      // Score should be reset
      expect(session!.players[0].score).toBe(0);
      expect(session!.players[0].usedTokens).toEqual([]);
    });
  });

  describe('cancelGeneration', () => {
    it('should return null for non-host', () => {
      const channelId = getUniqueChannelId();
      const user1 = createUser('user1');
      const user2 = createUser('user2');
      
      getOrCreateSession(channelId, '', '', user1, 'browser');
      getOrCreateSession(channelId, '', '', user2, 'browser');
      
      const result = cancelGeneration(channelId, 'user2');
      expect(result).toBeNull();
    });

    it('should cancel and reset isGeneratingQuestions', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      const { session } = getOrCreateSession(channelId, '', '', user, 'browser');
      session.isGeneratingQuestions = true;
      
      const result = cancelGeneration(channelId, 'user1');
      expect(result?.isGeneratingQuestions).toBe(false);
    });
  });

  describe('submitVote', () => {
    it('should submit vote correctly', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      // Manually change to voting phase
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      
      const result = submitVote(channelId, 'user1', 0, 5);
      
      expect(result?.votes).toHaveLength(1);
      expect(result?.votes[0].playerId).toBe('user1');
      expect(result?.votes[0].answer).toBe(0);
      expect(result?.votes[0].token).toBe(5);
    });

    it('should reject vote from spectator', async () => {
      const channelId = getUniqueChannelId();
      const host = createUser('host');
      
      const { session } = getOrCreateSession(channelId, '', '', host, 'browser');
      await startGame(channelId, 'host');
      
      // Add spectator
      const spectator = createUser('spectator');
      session.spectators.push({
        id: spectator.id,
        discordUser: spectator,
        score: 0,
        tokenCounts: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 },
        usedTokens: [],
        isHost: false,
        isConnected: true,
        isSpectator: true,
        joinedAt: Date.now(),
        powerUps: [],
        streak: { current: 0, best: 0 },
        gambit: null,
        lastAnswerTime: null,
      });
      session.currentPhase = 'voting';
      
      const result = submitVote(channelId, 'spectator', 0, 5);
      expect(result).toBeNull();
    });

    it('should reject invalid token', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.players[0].tokenCounts = { 1: 1, 2: 1, 3: 1 }; // Token 5 not available
      
      const result = submitVote(channelId, 'user1', 0, 5);
      expect(result).toBeNull();
    });

    it('should auto-advance to reveal when all players voted', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      
      const result = submitVote(channelId, 'user1', 0, 5);
      
      expect(result?.currentPhase).toBe('reveal');
    });
  });

  describe('autoVote', () => {
    it('should auto-vote with lowest token', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.players[0].tokenCounts = { 3: 1, 5: 1, 7: 1 }; // Lowest is 3
      
      const result = autoVote(channelId, 'user1');
      
      expect(result?.votes).toHaveLength(1);
      expect(result?.votes[0].token).toBe(3);
    });

    it('should not auto-vote if already voted', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.votes.push({
        playerId: 'user1',
        answer: 0,
        token: 5,
        submittedAt: Date.now(),
        powerUpUsed: null,
        eliminatedOptions: null,
      });
      
      const result = autoVote(channelId, 'user1');
      expect(result?.votes).toHaveLength(1);
    });

    it('should auto-vote for true-false questions', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentQuestion = {
        id: 'tf1',
        type: 'true-false',
        text: 'Is this true?',
        correctAnswer: true,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      
      const result = autoVote(channelId, 'user1');
      expect(result?.votes).toHaveLength(1);
      expect(typeof result?.votes[0].answer).toBe('boolean');
    });

    it('should auto-vote for more-or-less questions', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentQuestion = {
        id: 'mol1',
        type: 'more-or-less',
        text: 'Which is more?',
        option1: 'A (10)',
        option2: 'B (20)',
        correctAnswer: 1,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      
      const result = autoVote(channelId, 'user1');
      expect(result?.votes).toHaveLength(1);
      expect([0, 1]).toContain(result?.votes[0].answer);
    });

    it('should auto-vote for numerical questions with answer far from correct', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      const correctAnswer = 100;
      const acceptableRange = 10;
      session.currentQuestion = {
        id: 'num1',
        type: 'numerical',
        text: 'What is the number?',
        correctAnswer,
        acceptableRange,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      
      const result = autoVote(channelId, 'user1');
      expect(result?.votes).toHaveLength(1);
      expect(typeof result?.votes[0].answer).toBe('number');
      
      // Verify answer is far from correct (outside acceptable range)
      const answer = result?.votes[0].answer as number;
      const diff = Math.abs(answer - correctAnswer);
      expect(diff).toBeGreaterThan(acceptableRange);
    });
  });

  describe('changePhase', () => {
    it('should change phase correctly', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const result = changePhase(channelId, 'user1', 'voting');
      
      expect(result?.currentPhase).toBe('voting');
      expect(result?.votingPhaseStartedAt).not.toBeNull();
    });

    it('should handle next round from reveal', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'reveal';
      session.currentRound = 1;
      
      const result = changePhase(channelId, 'user1', 'question');
      
      expect(result?.currentRound).toBe(2);
      expect(result?.currentPhase).toBe('question');
    });

    it('should go to results on final round', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'reveal';
      session.currentRound = session.totalRounds;
      
      const result = changePhase(channelId, 'user1', 'question');
      
      expect(result?.currentPhase).toBe('results');
    });
  });

  describe('resetGame', () => {
    it('should reset game state', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      // Simulate some game progress
      const session = getSession(channelId)!;
      session.players[0].score = 25;
      session.players[0].usedTokens = [5, 10];
      session.currentRound = 5;
      session.currentPhase = 'results';
      
      const result = resetGame(channelId, 'user1');
      
      expect(result?.currentPhase).toBe('lobby');
      expect(result?.currentRound).toBe(0);
      expect(result?.players[0].score).toBe(0);
      expect(result?.players[0].tokenCounts).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 });
      expect(result?.questionHistory).toEqual([]);
    });

    it('should move spectators back to players', async () => {
      const channelId = getUniqueChannelId();
      const host = createUser('host');
      const spectator = createUser('spectator');
      
      const { session } = getOrCreateSession(channelId, '', '', host, 'browser');
      session.spectators.push({
        id: spectator.id,
        discordUser: spectator,
        score: 0,
        tokenCounts: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 },
        usedTokens: [],
        isHost: false,
        isConnected: true,
        isSpectator: true,
        joinedAt: Date.now(),
        powerUps: [],
        streak: { current: 0, best: 0 },
        gambit: null,
        lastAnswerTime: null,
      });
      
      const result = resetGame(channelId, 'host');
      
      expect(result?.players).toHaveLength(2);
      expect(result?.spectators).toHaveLength(0);
    });
  });

  describe('playAgain', () => {
    it('should reset and start new game atomically', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      // Simulate completed game
      const session = getSession(channelId)!;
      session.currentPhase = 'results';
      session.currentRound = session.totalRounds;
      session.players[0].score = 25;
      session.players[0].usedTokens = [5, 10];
      session.players[0].tokenCounts = { 1: 1, 2: 1, 3: 1, 4: 1, 6: 1, 7: 1, 8: 1, 9: 1 };
      
      const result = await playAgain(channelId, 'user1');
      
      expect(result).not.toBeNull();
      expect(result?.currentPhase).toBe('question');
      expect(result?.currentRound).toBe(1);
      expect(result?.players[0].score).toBe(0);
      expect(result?.players[0].tokenCounts).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 });
      expect(result?.questionHistory.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent session', async () => {
      const result = await playAgain('nonexistent', 'user1');
      expect(result).toBeNull();
    });

    it('should return null for non-host', async () => {
      const channelId = getUniqueChannelId();
      const host = createUser('host');
      const player = createUser('player');
      
      getOrCreateSession(channelId, '', '', host, 'browser');
      getOrCreateSession(channelId, '', '', player, 'browser');
      await startGame(channelId, 'host');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'results';
      
      const result = await playAgain(channelId, 'player');
      expect(result).toBeNull();
    });

    it('should move spectators back to players', async () => {
      const channelId = getUniqueChannelId();
      const host = createUser('host');
      const spectator = createUser('spectator');
      
      const { session } = getOrCreateSession(channelId, '', '', host, 'browser');
      await startGame(channelId, 'host');
      
      session.currentPhase = 'results';
      session.spectators.push({
        id: spectator.id,
        discordUser: spectator,
        score: 0,
        tokenCounts: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 },
        usedTokens: [],
        isHost: false,
        isConnected: true,
        isSpectator: true,
        joinedAt: Date.now(),
        powerUps: [],
        streak: { current: 0, best: 0 },
        gambit: null,
        lastAnswerTime: null,
      });
      
      const result = await playAgain(channelId, 'host');
      
      expect(result?.players).toHaveLength(2);
      expect(result?.spectators).toHaveLength(0);
      expect(result?.players.every(p => !p.isSpectator)).toBe(true);
    });

    it('should broadcast generating status', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'results';
      
      const broadcasts: string[] = [];
      const broadcastFn = (_ch: string, type: string) => {
        broadcasts.push(type);
      };
      
      await playAgain(channelId, 'user1', broadcastFn);
      
      expect(broadcasts).toContain('generating_questions');
    });

    it('should return lobby phase when no active players', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      const { session } = getOrCreateSession(channelId, '', '', user, 'browser');
      session.currentPhase = 'results';
      session.players[0].isConnected = false;
      
      const result = await playAgain(channelId, 'user1');
      
      // Should reset but not start game since no active players
      expect(result?.currentPhase).toBe('lobby');
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('should remove inactive sessions', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      const { session } = getOrCreateSession(channelId, '', '', user, 'browser');
      // Set lastActivity to 2 hours ago
      session.lastActivity = Date.now() - (2 * 60 * 60 * 1000);
      
      cleanupInactiveSessions(60); // 60 minute threshold
      
      expect(getSession(channelId)).toBeNull();
    });

    it('should keep active sessions', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      
      cleanupInactiveSessions(60);
      
      expect(getSession(channelId)).not.toBeNull();
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      
      const analytics = getAnalytics();
      
      expect(analytics).toHaveProperty('overview');
      expect(analytics).toHaveProperty('breakdown');
      expect(analytics).toHaveProperty('topPlayers');
      expect(analytics).toHaveProperty('sessions');
      expect(analytics).toHaveProperty('timestamp');
      expect(analytics.overview.totalSessions).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================
  // New Game Mechanics Tests
  // ============================================

  describe('New Player Properties', () => {
    it('should initialize player with power-ups', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      const { player } = getOrCreateSession(channelId, '', '', user, 'browser');
      
      expect(player.powerUps).toHaveLength(3);
      expect(player.powerUps.every(p => p.used === false)).toBe(true);
    });

    it('should initialize player with streak state', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      const { player } = getOrCreateSession(channelId, '', '', user, 'browser');
      
      expect(player.streak).toEqual({ current: 0, best: 0 });
    });

    it('should initialize player with null gambit', () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      const { player } = getOrCreateSession(channelId, '', '', user, 'browser');
      
      expect(player.gambit).toBeNull();
    });

    it('should reset power-ups on game start', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      const { session } = getOrCreateSession(channelId, '', '', user, 'browser');
      
      // Simulate used power-up
      session.players[0].powerUps[0].used = true;
      
      await startGame(channelId, 'user1');
      
      const updatedSession = getSession(channelId);
      expect(updatedSession?.players[0].powerUps.every(p => p.used === false)).toBe(true);
    });

    it('should reset streak on game start', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      const { session } = getOrCreateSession(channelId, '', '', user, 'browser');
      session.players[0].streak = { current: 5, best: 5 };
      
      await startGame(channelId, 'user1');
      
      const updatedSession = getSession(channelId);
      expect(updatedSession?.players[0].streak).toEqual({ current: 0, best: 0 });
    });
  });

  describe('Power-up Voting', () => {
    it('should submit vote with power-up', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      
      const result = submitVote(channelId, 'user1', 0, 5, 'double-down', null);
      
      expect(result?.votes[0].powerUpUsed).toBe('double-down');
    });

    it('should reject vote with unavailable power-up', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      // Mark power-up as used
      session.players[0].powerUps.find(p => p.type === 'double-down')!.used = true;
      
      const result = submitVote(channelId, 'user1', 0, 5, 'double-down', null);
      
      // Vote should still be submitted, but without the power-up
      expect(result?.votes[0].powerUpUsed).toBeNull();
    });

    it('should include eliminated options for 50/50', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      
      const result = submitVote(channelId, 'user1', 0, 5, '50-50', [1, 2]);
      
      expect(result?.votes[0].eliminatedOptions).toEqual([1, 2]);
    });
  });

  describe('activateGambit', () => {
    it('should activate gambit at 3rd-to-last round', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentRound = 8; // 3rd-to-last for 10 rounds
      
      const result = activateGambit(channelId, 'user1');
      
      expect(result).not.toBeNull();
      expect(result?.players[0].gambit).not.toBeNull();
      expect(result?.players[0].gambit?.isActive).toBe(true);
      expect(result?.players[0].gambit?.stakeTokenValue).toBe(10);
      expect(result?.players[0].gambit?.consecutiveCorrect).toBe(0);
    });

    it('should reject gambit at wrong round', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentRound = 5; // Not 3rd-to-last
      
      const result = activateGambit(channelId, 'user1');
      
      expect(result).toBeNull();
    });

    it('should reject gambit if already active', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentRound = 8;
      session.players[0].gambit = {
        isActive: true,
        startedAtRound: 8,
        stakeTokenValue: 10,
        consecutiveCorrect: 0,
        completed: false,
        won: false,
      };
      
      const result = activateGambit(channelId, 'user1');
      
      expect(result).toBeNull();
    });

    it('should use highest available token as stake', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentRound = 8;
      session.players[0].tokenCounts = { 1: 1, 2: 1, 3: 1, 7: 1 }; // Highest is 7
      
      const result = activateGambit(channelId, 'user1');
      
      expect(result?.players[0].gambit?.stakeTokenValue).toBe(7);
    });
  });

  describe('Token Trading', () => {
    describe('tradeTokensUp', () => {
      it('should trade 2 tokens for 1 higher value (2N capped at 10)', () => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        getOrCreateSession(channelId, '', '', user, 'browser');
        
        const session = getSession(channelId)!;
        session.currentPhase = 'lobby';
        session.players[0].tokenCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 2, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
        
        const result = tradeTokensUp(channelId, 'user1', 5);
        
        // 2x5 → 1x min(10, 10) = 1x10
        expect(result?.players[0].tokenCounts[5]).toBe(0);
        expect(result?.players[0].tokenCounts[10]).toBe(1);
      });

      it('should reject trade without enough tokens', () => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        getOrCreateSession(channelId, '', '', user, 'browser');
        
        const session = getSession(channelId)!;
        session.currentPhase = 'lobby';
        session.players[0].tokenCounts[5] = 1; // Only 1, need 2
        
        const result = tradeTokensUp(channelId, 'user1', 5);
        
        expect(result).toBeNull();
      });

      it('should allow fusing value 10 (2x10 → 1x10)', () => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        getOrCreateSession(channelId, '', '', user, 'browser');
        
        const session = getSession(channelId)!;
        session.currentPhase = 'lobby';
        session.players[0].tokenCounts[10] = 2;
        
        const result = tradeTokensUp(channelId, 'user1', 10);
        
        // Fusing 2x10 gives 1x10 (capped at 10), but still allowed
        expect(result).not.toBeNull();
        expect(result?.players[0].tokenCounts[10]).toBe(1);
      });

      it('should work in question phase', () => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        getOrCreateSession(channelId, '', '', user, 'browser');
        
        const session = getSession(channelId)!;
        session.currentPhase = 'question';
        session.players[0].tokenCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 2, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
        
        const result = tradeTokensUp(channelId, 'user1', 5);
        
        expect(result).not.toBeNull();
      });

      it('should reject trade during voting phase', () => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        getOrCreateSession(channelId, '', '', user, 'browser');
        
        const session = getSession(channelId)!;
        session.currentPhase = 'voting';
        session.players[0].tokenCounts[5] = 2;
        
        const result = tradeTokensUp(channelId, 'user1', 5);
        
        expect(result).toBeNull();
      });
    });

    describe('tradeTokensDown', () => {
      it('should trade 1 token for 2 lower value', () => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        getOrCreateSession(channelId, '', '', user, 'browser');
        
        const session = getSession(channelId)!;
        session.currentPhase = 'lobby';
        session.players[0].tokenCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 0, 8: 0, 9: 0, 10: 0 };
        
        const result = tradeTokensDown(channelId, 'user1', 6);
        
        expect(result?.players[0].tokenCounts[6]).toBe(0);
        expect(result?.players[0].tokenCounts[3]).toBe(2); // floor(6/2) = 3
      });

      it('should reject trade from value 1 (cannot trade further down)', () => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        getOrCreateSession(channelId, '', '', user, 'browser');
        
        const session = getSession(channelId)!;
        session.currentPhase = 'lobby';
        
        const result = tradeTokensDown(channelId, 'user1', 1);
        
        expect(result).toBeNull();
      });

      it('should allow trade from value 2 (gives 2x value 1)', () => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        getOrCreateSession(channelId, '', '', user, 'browser');
        
        const session = getSession(channelId)!;
        session.currentPhase = 'lobby';
        
        const result = tradeTokensDown(channelId, 'user1', 2);
        
        expect(result).not.toBeNull();
        expect(result?.players[0].tokenCounts[2]).toBe(0);
        expect(result?.players[0].tokenCounts[1]).toBe(3); // Original 1 + 2 new
      });

      it('should handle odd-valued tokens correctly', () => {
        const channelId = getUniqueChannelId();
        const user = createUser('user1');
        
        getOrCreateSession(channelId, '', '', user, 'browser');
        
        const session = getSession(channelId)!;
        session.currentPhase = 'lobby';
        session.players[0].tokenCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1, 8: 0, 9: 0, 10: 0 };
        
        const result = tradeTokensDown(channelId, 'user1', 7);
        
        expect(result?.players[0].tokenCounts[7]).toBe(0);
        // floor(7/2) = 3, ceil(7/2) = 4, so 1x3 + 1x4
        expect(result?.players[0].tokenCounts[3]).toBe(1);
        expect(result?.players[0].tokenCounts[4]).toBe(1);
      });
    });
  });

  describe('get5050Options', () => {
    it('should return 2 wrong options for multiple choice', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentQuestion = {
        id: 'mc1',
        type: 'multiple-choice',
        text: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0, // A is correct
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      
      const eliminatedOptions = get5050Options(channelId, 'user1');
      
      expect(eliminatedOptions).toHaveLength(2);
      expect(eliminatedOptions).not.toContain(0); // Should not contain correct answer
    });

    it('should return null if 50/50 already used', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentQuestion = {
        id: 'mc1',
        type: 'multiple-choice',
        text: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      // Mark 50/50 as used
      session.players[0].powerUps.find(p => p.type === '50-50')!.used = true;
      
      const result = get5050Options(channelId, 'user1');
      
      expect(result).toBeNull();
    });

    it('should return null for non-multiple-choice questions', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentQuestion = {
        id: 'tf1',
        type: 'true-false',
        text: 'Is this true?',
        correctAnswer: true,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      
      const result = get5050Options(channelId, 'user1');
      
      expect(result).toBeNull();
    });
  });

  describe('Scoring with New Mechanics', () => {
    it('should apply streak bonus on consecutive correct answers', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentQuestion = {
        id: 'mc1',
        type: 'multiple-choice',
        text: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      // Simulate existing streak
      session.players[0].streak = { current: 2, best: 2 };
      
      submitVote(channelId, 'user1', 0, 5, null, null); // Correct answer
      
      const updatedSession = getSession(channelId)!;
      // Score should be 5 (token) + 2 (streak bonus for 3 streak) = 7
      expect(updatedSession.players[0].score).toBe(7);
      expect(updatedSession.players[0].streak.current).toBe(3);
    });

    it('should reset streak on wrong answer', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentQuestion = {
        id: 'mc1',
        type: 'multiple-choice',
        text: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      session.players[0].streak = { current: 3, best: 3 };
      
      submitVote(channelId, 'user1', 1, 5, null, null); // Wrong answer
      
      const updatedSession = getSession(channelId)!;
      expect(updatedSession.players[0].streak.current).toBe(0);
      expect(updatedSession.players[0].streak.best).toBe(3); // Best unchanged
    });

    it('should apply safety net on wrong answer', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentQuestion = {
        id: 'mc1',
        type: 'multiple-choice',
        text: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      const originalToken5Count = session.players[0].tokenCounts[5];
      
      submitVote(channelId, 'user1', 1, 5, 'safety-net', null); // Wrong answer with safety net
      
      const updatedSession = getSession(channelId)!;
      // Token should not be decremented due to safety net
      expect(updatedSession.players[0].tokenCounts[5]).toBe(originalToken5Count);
      expect(updatedSession.players[0].powerUps.find(p => p.type === 'safety-net')?.used).toBe(true);
    });

    it('should double score with double-down on correct answer', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentQuestion = {
        id: 'mc1',
        type: 'multiple-choice',
        text: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      
      submitVote(channelId, 'user1', 0, 5, 'double-down', null); // Correct with double-down
      
      const updatedSession = getSession(channelId)!;
      // Score should be 5 * 2 = 10
      expect(updatedSession.players[0].score).toBe(10);
    });

    it('should apply speed demon bonus for fast answers', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      const now = Date.now();
      session.votingPhaseStartedAt = now - 1000; // Started 1 second ago
      session.currentQuestion = {
        id: 'mc1',
        type: 'multiple-choice',
        text: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      
      submitVote(channelId, 'user1', 0, 5, null, null); // Correct answer
      
      const updatedSession = getSession(channelId)!;
      // Score should be 5 + 2 (speed demon) = 7
      expect(updatedSession.players[0].score).toBe(7);
    });

    it('should progress gambit on correct answer', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentRound = 8;
      session.players[0].gambit = {
        isActive: true,
        startedAtRound: 8,
        stakeTokenValue: 10,
        consecutiveCorrect: 1,
        completed: false,
        won: false,
      };
      session.currentQuestion = {
        id: 'mc1',
        type: 'multiple-choice',
        text: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      
      submitVote(channelId, 'user1', 0, 5, null, null);
      
      const updatedSession = getSession(channelId)!;
      expect(updatedSession.players[0].gambit?.consecutiveCorrect).toBe(2);
    });

    it('should complete gambit with reward on 3 consecutive correct', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentRound = 10;
      session.players[0].gambit = {
        isActive: true,
        startedAtRound: 8,
        stakeTokenValue: 10,
        consecutiveCorrect: 2,
        completed: false,
        won: false,
      };
      session.currentQuestion = {
        id: 'mc1',
        type: 'multiple-choice',
        text: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      
      submitVote(channelId, 'user1', 0, 5, null, null);
      
      const updatedSession = getSession(channelId)!;
      expect(updatedSession.players[0].gambit?.completed).toBe(true);
      expect(updatedSession.players[0].gambit?.won).toBe(true);
      // Score should include gambit reward: 5 (token) + 20 (gambit reward = 10 * 2)
      expect(updatedSession.players[0].score).toBe(25);
    });

    it('should fail gambit with penalty on wrong answer', async () => {
      const channelId = getUniqueChannelId();
      const user = createUser('user1');
      
      getOrCreateSession(channelId, '', '', user, 'browser');
      await startGame(channelId, 'user1');
      
      const session = getSession(channelId)!;
      session.currentPhase = 'voting';
      session.currentRound = 9;
      session.players[0].score = 30;
      session.players[0].gambit = {
        isActive: true,
        startedAtRound: 8,
        stakeTokenValue: 10,
        consecutiveCorrect: 1,
        completed: false,
        won: false,
      };
      session.currentQuestion = {
        id: 'mc1',
        type: 'multiple-choice',
        text: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        category: 'test',
        difficulty: 'easy',
        explanation: 'Test',
      };
      
      submitVote(channelId, 'user1', 1, 5, null, null); // Wrong answer
      
      const updatedSession = getSession(channelId)!;
      expect(updatedSession.players[0].gambit?.completed).toBe(true);
      expect(updatedSession.players[0].gambit?.won).toBe(false);
      // Score should be reduced by stake: 30 - 10 = 20
      expect(updatedSession.players[0].score).toBe(20);
    });
  });
});
