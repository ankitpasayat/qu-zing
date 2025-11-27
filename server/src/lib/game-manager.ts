import { 
  GameSession, 
  Player, 
  Question, 
  PlayerVote, 
  DiscordUser, 
  GameSettings,
  DEFAULT_SETTINGS,
  GamePhase,
  Platform,
  generateTokenCounts,
  getAvailableTokens
} from '../types/game.js';
import { getRandomQuestions } from './questions.js';
import { logger } from './logger.js';

// In-memory storage - keyed by channelId (Discord voice channel) or lobby code (browser)
const gameSessions = new Map<string, GameSession>();

// Track active generation requests for cancellation
const activeGenerations = new Map<string, AbortController>();

// Get or create a session for a Discord channel or browser lobby
export function getOrCreateSession(
  channelId: string,
  guildId: string,
  instanceId: string,
  user: DiscordUser,
  platform: Platform = 'discord'
): { session: GameSession; player: Player; isNewSession: boolean } {
  let session = gameSessions.get(channelId);
  let isNewSession = false;

  if (!session) {
    // Create new session
    session = {
      channelId,
      guildId,
      instanceId,
      platform,
      hostId: user.id,
      players: [],
      spectators: [],
      currentPhase: 'waiting',
      currentRound: 0,
      totalRounds: 10,
      currentQuestion: null,
      votes: [],
      questionHistory: [],
      isGeneratingQuestions: false,
      settings: { ...DEFAULT_SETTINGS },
      createdAt: Date.now(),
      lastActivity: Date.now(),
      roundStartedAt: null,
      questionPhaseStartedAt: null,
      votingPhaseStartedAt: null,
      revealPhaseStartedAt: null,
    };
    gameSessions.set(channelId, session);
    isNewSession = true;
    logger.info(`New ${platform} session created for channel/lobby ${channelId}`);
  }

  // Check if player already exists
  let player = session.players.find((p: Player) => p.id === user.id);
  
  if (!player) {
    // Check spectators too
    player = session.spectators.find((p: Player) => p.id === user.id);
  }

  if (player) {
    // Player reconnecting
    player.isConnected = true;
    player.discordUser = user; // Update user info in case it changed
    logger.info(`Player ${user.username} reconnected to channel ${channelId}`);
  } else {
    // New player joining
    const isGameInProgress = session.currentPhase !== 'waiting' && session.currentPhase !== 'lobby';
    
    // If game is in progress, join as spectator (regardless of allowMidGameJoin setting)
    // The allowMidGameJoin setting controls whether spectators get promoted to players between rounds
    player = {
      id: user.id,
      discordUser: user,
      score: 0,
      tokenCounts: generateTokenCounts(session.settings.totalRounds),
      usedTokens: [],
      isHost: session.players.length === 0 && !isGameInProgress, // First non-spectator player is host
      isConnected: true,
      isSpectator: isGameInProgress, // Always join as spectator if game is in progress
      joinedAt: Date.now(),
    };
    
    // If this is the first player and no host exists, make them host
    if (session.players.length === 0 && !isGameInProgress) {
      session.hostId = user.id;
    }

    if (player.isSpectator) {
      session.spectators.push(player);
      logger.info(`Player ${user.username} joined as spectator in channel ${channelId}`);
    } else {
      session.players.push(player);
      logger.info(`Player ${user.username} joined channel ${channelId}`);
    }
  }

  session.lastActivity = Date.now();
  
  // Auto-transition from waiting to lobby when first player joins
  if (session.currentPhase === 'waiting' && session.players.length > 0) {
    session.currentPhase = 'lobby';
  }

  return { session, player, isNewSession };
}

// Get session by channel ID
export function getSession(channelId: string): GameSession | null {
  return gameSessions.get(channelId) || null;
}

// Remove a player from a session
export function removePlayer(channelId: string, playerId: string): GameSession | null {
  const session = gameSessions.get(channelId);
  if (!session) return null;

  // Remove from players or spectators
  session.players = session.players.filter((p: Player) => p.id !== playerId);
  session.spectators = session.spectators.filter((p: Player) => p.id !== playerId);

  // If host left, assign new host
  if (session.hostId === playerId && session.players.length > 0) {
    const newHost = session.players[0];
    newHost.isHost = true;
    session.hostId = newHost.id;
    logger.info(`Host transferred to ${newHost.discordUser.username} in channel ${channelId}`);
  }

  // If no players left, clean up session
  if (session.players.length === 0 && session.spectators.length === 0) {
    gameSessions.delete(channelId);
    logger.info(`Session ${channelId} deleted - no players remaining`);
    return null;
  }

  session.lastActivity = Date.now();
  return session;
}

// Mark player as disconnected (but don't remove - they might reconnect)
export function disconnectPlayer(channelId: string, playerId: string): GameSession | null {
  const session = gameSessions.get(channelId);
  if (!session) return null;

  const player = session.players.find((p: Player) => p.id === playerId) 
    || session.spectators.find((p: Player) => p.id === playerId);
  
  if (player) {
    player.isConnected = false;
    logger.info(`Player ${player.discordUser.username} disconnected from channel ${channelId}`);
  }

  session.lastActivity = Date.now();
  return session;
}

// Gracefully exit game - player voluntarily leaves (not just disconnecting)
// This removes them from the session entirely
export function exitGame(channelId: string, playerId: string): { session: GameSession | null; wasHost: boolean; newHostId: string | null } {
  const session = gameSessions.get(channelId);
  if (!session) return { session: null, wasHost: false, newHostId: null };

  const player = session.players.find((p: Player) => p.id === playerId) 
    || session.spectators.find((p: Player) => p.id === playerId);
  
  if (!player) return { session: null, wasHost: false, newHostId: null };

  const wasHost = session.hostId === playerId;
  let newHostId: string | null = null;

  // Remove from players or spectators
  session.players = session.players.filter((p: Player) => p.id !== playerId);
  session.spectators = session.spectators.filter((p: Player) => p.id !== playerId);

  // If host left, assign new host to first connected player
  if (wasHost && session.players.length > 0) {
    const connectedPlayers = session.players.filter((p: Player) => p.isConnected);
    const newHost = connectedPlayers[0] || session.players[0];
    if (newHost) {
      newHost.isHost = true;
      session.hostId = newHost.id;
      newHostId = newHost.id;
      logger.info(`Host transferred to ${newHost.discordUser.username} in channel ${channelId} (exit)`);
    }
  }

  // Remove vote from this player if in voting phase
  if (session.currentPhase === 'voting') {
    session.votes = session.votes.filter((v: PlayerVote) => v.playerId !== playerId);
  }

  // If no players left, clean up session
  if (session.players.length === 0 && session.spectators.length === 0) {
    gameSessions.delete(channelId);
    logger.info(`Session ${channelId} deleted - last player exited`);
    return { session: null, wasHost, newHostId };
  }

  // Check if we should auto-advance after a player leaves
  if (session.currentPhase === 'voting') {
    const activePlayers = session.players.filter((p: Player) => p.isConnected && !p.isSpectator);
    if (session.votes.length >= activePlayers.length && activePlayers.length > 0) {
      processRoundResultsExternal(session);
    }
  }

  session.lastActivity = Date.now();
  logger.info(`Player ${player.discordUser.username} exited game in channel ${channelId}`);
  
  return { session, wasHost, newHostId };
}

// Expose processRoundResults for exitGame to use
function processRoundResultsExternal(session: GameSession): void {
  processRoundResults(session);
}

// Transfer host to another player
export function transferHost(channelId: string, currentHostId: string, newHostId: string): GameSession | null {
  const session = gameSessions.get(channelId);
  if (!session || session.hostId !== currentHostId) return null;

  const currentHost = session.players.find((p: Player) => p.id === currentHostId);
  const newHost = session.players.find((p: Player) => p.id === newHostId);

  if (!newHost) return null;

  if (currentHost) {
    currentHost.isHost = false;
  }
  newHost.isHost = true;
  session.hostId = newHostId;
  session.lastActivity = Date.now();

  logger.info(`Host transferred from ${currentHostId} to ${newHostId} in channel ${channelId}`);
  return session;
}

// Update game settings
export function updateSettings(channelId: string, hostId: string, settings: Partial<GameSettings>): GameSession | null {
  const session = gameSessions.get(channelId);
  if (!session || session.hostId !== hostId) return null;
  if (session.currentPhase !== 'lobby' && session.currentPhase !== 'waiting') return null;

  // Check if totalRounds is changing
  const totalRoundsChanged = settings.totalRounds !== undefined && 
    settings.totalRounds !== session.settings.totalRounds;

  session.settings = { ...session.settings, ...settings };
  session.lastActivity = Date.now();

  // Regenerate token counts for all players when totalRounds changes
  if (totalRoundsChanged) {
    const newTotalRounds = session.settings.totalRounds;
    [...session.players, ...session.spectators].forEach((player: Player) => {
      player.tokenCounts = generateTokenCounts(newTotalRounds);
    });
    logger.info(`Token counts regenerated for ${newTotalRounds} rounds in channel ${channelId}`);
  }
  
  logger.info(`Settings updated in channel ${channelId}`, settings);
  return session;
}

// Start the game
export async function startGame(channelId: string, hostId: string, broadcastFn?: (channelId: string, type: string, session: unknown) => void): Promise<GameSession | null> {
  const session = gameSessions.get(channelId);
  if (!session) {
    logger.warn(`startGame failed: session not found for channel ${channelId}`);
    logger.warn(`Available sessions: ${Array.from(gameSessions.keys()).join(', ') || 'none'}`);
    return null;
  }
  if (session.hostId !== hostId) {
    logger.warn(`startGame failed: hostId mismatch. Expected ${session.hostId}, got ${hostId}`);
    return null;
  }
  if (session.currentPhase !== 'lobby') {
    logger.warn(`startGame failed: wrong phase. Current phase is ${session.currentPhase}, expected lobby`);
    return null;
  }
  
  // Can start with 1 player (solo mode) or more
  const activePlayerCount = session.players.filter((p: Player) => p.isConnected).length;
  if (activePlayerCount < 1) {
    logger.warn(`startGame failed: no active players (count: ${activePlayerCount})`);
    return null;
  }

  // Regenerate token counts for all players to match current totalRounds setting
  const totalRounds = session.settings.totalRounds;
  session.players.forEach((player: Player) => {
    player.tokenCounts = generateTokenCounts(totalRounds);
    player.usedTokens = [];
    player.score = 0;
  });

  // Create abort controller for this generation
  const abortController = new AbortController();
  activeGenerations.set(channelId, abortController);

  try {
    // Set generating flag and broadcast to all players BEFORE starting generation
    session.isGeneratingQuestions = true;
    session.lastActivity = Date.now();
    if (broadcastFn) {
      broadcastFn(channelId, 'generating_questions', session);
      logger.info(`Broadcasting generating_questions to channel ${channelId}`);
    }
    logger.info(`Generating questions for channel ${channelId}...`);

    const questions = await getRandomQuestions(session.settings.totalRounds, abortController.signal);
    
    // Check if cancelled
    if (abortController.signal.aborted) {
      logger.info(`Question generation cancelled for channel ${channelId}`);
      session.isGeneratingQuestions = false;
      activeGenerations.delete(channelId);
      return null;
    }
    
    logger.info(`Questions generated for channel ${channelId}`);
    
    // Update session with questions and clear generating flag
    session.isGeneratingQuestions = false;
    session.questionHistory = questions;
    session.totalRounds = session.settings.totalRounds;
    session.currentRound = 1;
    session.currentQuestion = questions[0];
    session.currentPhase = 'question';
    const now = Date.now();
    session.roundStartedAt = now;
    session.questionPhaseStartedAt = now;
    session.votingPhaseStartedAt = null;
    session.revealPhaseStartedAt = null;
    session.lastActivity = now;
    
    activeGenerations.delete(channelId);

    logger.info(`Game started in channel ${channelId} with ${activePlayerCount} players`);
    
    // Return the complete session with questions for immediate broadcast
    return session;
  } catch (error) {
    // Check if this is an abort error
    if (error instanceof Error && error.name === 'AbortError') {
      logger.info(`Question generation aborted for channel ${channelId}`);
      session.isGeneratingQuestions = false;
      activeGenerations.delete(channelId);
      return null;
    }
    
    logger.error(`Failed to start game in channel ${channelId}`, error);
    session.isGeneratingQuestions = false;
    activeGenerations.delete(channelId);
    if (broadcastFn) {
      broadcastFn(channelId, 'generation_failed', session);
    }
    return null;
  }
}

// Cancel question generation
export function cancelGeneration(channelId: string, hostId: string): GameSession | null {
  const session = gameSessions.get(channelId);
  if (!session) return null;
  if (session.hostId !== hostId) return null;
  
  const abortController = activeGenerations.get(channelId);
  if (abortController) {
    abortController.abort();
    activeGenerations.delete(channelId);
    logger.info(`Question generation cancelled by host for channel ${channelId}`);
  }
  
  session.isGeneratingQuestions = false;
  session.lastActivity = Date.now();
  
  return session;
}

// Change phase
export function changePhase(channelId: string, hostId: string, phase: GamePhase): GameSession | null {
  const session = gameSessions.get(channelId);
  if (!session) return null;
  if (session.hostId !== hostId) return null;

  // Handle phase transition to 'question' (next round)
  if (phase === 'question' && session.currentPhase === 'reveal') {
    return nextRound(channelId);
  }

  const now = Date.now();
  session.currentPhase = phase;
  
  // Set appropriate phase timestamp
  if (phase === 'question') {
    session.questionPhaseStartedAt = now;
  } else if (phase === 'voting') {
    session.votingPhaseStartedAt = now;
  } else if (phase === 'reveal') {
    session.revealPhaseStartedAt = now;
  }
  
  session.lastActivity = now;

  logger.info(`Phase changed to ${phase} in channel ${channelId}`);
  return session;
}

// Submit a vote
export function submitVote(
  channelId: string, 
  playerId: string, 
  answer: number | boolean, 
  token: number
): GameSession | null {
  const session = gameSessions.get(channelId);
  if (!session || session.currentPhase !== 'voting') return null;

  const player = session.players.find((p: Player) => p.id === playerId);
  if (!player || player.isSpectator) return null;
  if (!player.tokenCounts[token] || player.tokenCounts[token] <= 0) return null;

  // Update or add vote
  const existingVoteIndex = session.votes.findIndex((v: PlayerVote) => v.playerId === playerId);
  const vote: PlayerVote = { playerId, answer, token, submittedAt: Date.now() };
  
  if (existingVoteIndex >= 0) {
    session.votes[existingVoteIndex] = vote;
  } else {
    session.votes.push(vote);
  }

  session.lastActivity = Date.now();

  // Check if all active players have voted
  const activePlayers = session.players.filter((p: Player) => p.isConnected && !p.isSpectator);
  if (session.votes.length >= activePlayers.length) {
    processRoundResults(session);
  }

  logger.info(`Vote submitted by ${playerId} in channel ${channelId}`);
  return session;
}

// Auto-submit a vote for a player who didn't vote in time
export function autoVote(channelId: string, playerId: string): GameSession | null {
  const session = gameSessions.get(channelId);
  if (!session || session.currentPhase !== 'voting' || !session.currentQuestion) return null;

  const player = session.players.find((p: Player) => p.id === playerId);
  if (!player || player.isSpectator) return null;

  // Check if player already voted
  const hasVoted = session.votes.some((v: PlayerVote) => v.playerId === playerId);
  if (hasVoted) return session;

  // Get lowest available token
  const availableTokens = getAvailableTokens(player.tokenCounts);
  if (availableTokens.length === 0) return session;
  const lowestToken = Math.min(...availableTokens);
  
  // Generate random answer based on question type
  const question = session.currentQuestion;
  let randomAnswer: number | boolean;
  
  switch (question.type) {
    case 'multiple-choice':
      randomAnswer = Math.floor(Math.random() * question.options.length);
      break;
    case 'true-false':
      randomAnswer = Math.random() > 0.5;
      break;
    case 'more-or-less':
      randomAnswer = Math.random() > 0.5 ? 1 : 0;
      break;
    case 'numerical': {
      // Generate a random guess that's unlikely to be within the acceptable range
      // Use a random multiplier far from 1.0 to ensure the guess is wrong
      const range = question.acceptableRange || Math.max(1, Math.abs(question.correctAnswer * 0.1));
      // Generate answer either 3-5x too high or 0.1-0.3x of correct (far outside range)
      const multiplier = Math.random() > 0.5 
        ? 3 + Math.random() * 2  // 3x to 5x too high
        : 0.1 + Math.random() * 0.2;  // 10% to 30% of correct
      randomAnswer = Math.round(question.correctAnswer * multiplier);
      // Ensure answer is definitely outside the range
      if (Math.abs(randomAnswer - question.correctAnswer) <= range) {
        randomAnswer = question.correctAnswer + (range * 3) * (Math.random() > 0.5 ? 1 : -1);
      }
      break;
    }
    default:
      randomAnswer = 0;
  }

  // Submit auto-vote
  const vote: PlayerVote = { 
    playerId, 
    answer: randomAnswer, 
    token: lowestToken, 
    submittedAt: Date.now() 
  };
  session.votes.push(vote);
  session.lastActivity = Date.now();

  logger.info(`Auto-vote submitted for ${playerId} in channel ${channelId} (token: ${lowestToken}, answer: ${randomAnswer})`);

  // Check if all active players have now voted
  const activePlayers = session.players.filter((p: Player) => p.isConnected && !p.isSpectator);
  if (session.votes.length >= activePlayers.length) {
    processRoundResults(session);
  }

  return session;
}

// Process round results
function processRoundResults(session: GameSession): void {
  if (!session.currentQuestion) return;

  session.currentPhase = 'reveal';
  const now = Date.now();
  session.revealPhaseStartedAt = now; // Set timestamp for reveal phase timer sync
  session.lastActivity = now;
  const question = session.currentQuestion;

  session.votes.forEach((vote: PlayerVote) => {
    const player = session.players.find((p: Player) => p.id === vote.playerId);
    if (!player) return;

    // Decrement token count (remove one from the stack)
    if (player.tokenCounts[vote.token] > 0) {
      player.tokenCounts[vote.token]--;
    }

    // Check if answer is correct
    const isCorrect = checkAnswer(question, vote.answer);
    
    if (isCorrect) {
      player.score += vote.token;
      player.usedTokens.push(vote.token);
    }
  });

  logger.info(`Round ${session.currentRound} results processed in channel ${session.channelId}`);
}

// Check if an answer is correct
function checkAnswer(question: Question, answer: number | boolean): boolean {
  switch (question.type) {
    case 'multiple-choice':
      return typeof answer === 'number' && answer === question.correctAnswer;
    case 'true-false':
      return typeof answer === 'boolean' && answer === question.correctAnswer;
    case 'more-or-less':
      return typeof answer === 'number' && answer === question.correctAnswer;
    case 'numerical': {
      if (typeof answer !== 'number') return false;
      // Use provided range, or 10% of correct answer, with a minimum of 1
      const range = question.acceptableRange || Math.max(1, Math.abs(question.correctAnswer * 0.1));
      const diff = Math.abs(answer - question.correctAnswer);
      const isCorrect = diff <= range;
      logger.debug(`Numerical answer check: answer=${answer}, correct=${question.correctAnswer}, range=${range}, diff=${diff}, isCorrect=${isCorrect}`);
      return isCorrect;
    }
    default:
      return false;
  }
}

// Move to next round
function nextRound(channelId: string): GameSession | null {
  const session = gameSessions.get(channelId);
  if (!session) return null;

  // Promote spectators to players for next round
  if (session.settings.allowMidGameJoin) {
    session.spectators.forEach((spectator: Player) => {
      spectator.isSpectator = false;
      session.players.push(spectator);
    });
    session.spectators = [];
  }

  session.votes = [];

  if (session.currentRound >= session.totalRounds) {
    session.currentPhase = 'results';
    session.currentQuestion = null;
    logger.info(`Game ended in channel ${channelId}`);
  } else {
    session.currentRound += 1;
    session.currentQuestion = session.questionHistory[session.currentRound - 1];
    session.currentPhase = 'question';
    const now = Date.now();
    session.roundStartedAt = now;
    session.questionPhaseStartedAt = now;
    session.votingPhaseStartedAt = null;
    session.revealPhaseStartedAt = null;
    logger.info(`Round ${session.currentRound} started in channel ${channelId}`);
  }

  session.lastActivity = Date.now();
  return session;
}

// Reset game to lobby (play again)
export function resetGame(channelId: string, hostId: string): GameSession | null {
  const session = gameSessions.get(channelId);
  if (!session) return null;
  if (session.hostId !== hostId) return null;

  // Reset all players
  [...session.players, ...session.spectators].forEach((player: Player) => {
    player.score = 0;
    player.tokenCounts = generateTokenCounts(session.settings.totalRounds);
    player.usedTokens = [];
    player.isSpectator = false;
  });

  // Move spectators back to players
  session.players = [...session.players, ...session.spectators];
  session.spectators = [];

  // Reset game state
  session.currentPhase = 'lobby';
  session.currentRound = 0;
  session.currentQuestion = null;
  session.votes = [];
  session.questionHistory = [];
  session.roundStartedAt = null;
  session.questionPhaseStartedAt = null;
  session.votingPhaseStartedAt = null;
  session.revealPhaseStartedAt = null;
  session.lastActivity = Date.now();

  logger.info(`Game reset in channel ${channelId}`);
  return session;
}

// Play again - reset and start a new game in one atomic operation
// This prevents the UI from briefly showing the lobby screen
export async function playAgain(channelId: string, hostId: string, broadcastFn?: (channelId: string, type: string, session: unknown) => void): Promise<GameSession | null> {
  const session = gameSessions.get(channelId);
  if (!session) {
    logger.warn(`playAgain failed: session not found for channel ${channelId}`);
    return null;
  }
  if (session.hostId !== hostId) {
    logger.warn(`playAgain failed: hostId mismatch. Expected ${session.hostId}, got ${hostId}`);
    return null;
  }

  // Reset all players
  [...session.players, ...session.spectators].forEach((player: Player) => {
    player.score = 0;
    player.tokenCounts = generateTokenCounts(session.settings.totalRounds);
    player.usedTokens = [];
    player.isSpectator = false;
  });

  // Move spectators back to players
  session.players = [...session.players, ...session.spectators];
  session.spectators = [];

  // Reset game state but keep in 'results' phase while generating
  session.currentRound = 0;
  session.currentQuestion = null;
  session.votes = [];
  session.questionHistory = [];
  session.roundStartedAt = null;
  session.questionPhaseStartedAt = null;
  session.votingPhaseStartedAt = null;
  session.revealPhaseStartedAt = null;
  session.lastActivity = Date.now();

  logger.info(`Game reset for play again in channel ${channelId}`);

  // Now start the game (similar to startGame but session is already reset)
  const activePlayerCount = session.players.filter((p: Player) => p.isConnected).length;
  if (activePlayerCount < 1) {
    logger.warn(`playAgain failed: no active players (count: ${activePlayerCount})`);
    session.currentPhase = 'lobby';
    return session;
  }

  // Create abort controller for this generation
  const abortController = new AbortController();
  activeGenerations.set(channelId, abortController);

  try {
    // Set generating flag and broadcast to all players BEFORE starting generation
    session.isGeneratingQuestions = true;
    session.lastActivity = Date.now();
    if (broadcastFn) {
      broadcastFn(channelId, 'generating_questions', session);
      logger.info(`Broadcasting generating_questions for play again to channel ${channelId}`);
    }
    logger.info(`Generating questions for play again in channel ${channelId}...`);

    const questions = await getRandomQuestions(session.settings.totalRounds, abortController.signal);
    
    // Check if cancelled
    if (abortController.signal.aborted) {
      logger.info(`Question generation cancelled for play again in channel ${channelId}`);
      session.isGeneratingQuestions = false;
      session.currentPhase = 'lobby';
      activeGenerations.delete(channelId);
      return null;
    }
    
    logger.info(`Questions generated for play again in channel ${channelId}`);
    
    // Update session with questions and clear generating flag
    session.isGeneratingQuestions = false;
    session.questionHistory = questions;
    session.totalRounds = session.settings.totalRounds;
    session.currentRound = 1;
    session.currentQuestion = questions[0];
    session.currentPhase = 'question';
    const now = Date.now();
    session.roundStartedAt = now;
    session.questionPhaseStartedAt = now;
    session.votingPhaseStartedAt = null;
    session.revealPhaseStartedAt = null;
    session.lastActivity = now;
    
    activeGenerations.delete(channelId);

    logger.info(`Play again game started in channel ${channelId} with ${activePlayerCount} players`);
    
    return session;
  } catch (error) {
    // Check if this is an abort error
    if (error instanceof Error && error.name === 'AbortError') {
      logger.info(`Question generation aborted for play again in channel ${channelId}`);
      session.isGeneratingQuestions = false;
      session.currentPhase = 'lobby';
      activeGenerations.delete(channelId);
      return null;
    }
    
    logger.error(`Failed to play again in channel ${channelId}`, error);
    session.isGeneratingQuestions = false;
    session.currentPhase = 'lobby';
    activeGenerations.delete(channelId);
    if (broadcastFn) {
      broadcastFn(channelId, 'generation_failed', session);
    }
    return null;
  }
}

// Clean up inactive sessions
export function cleanupInactiveSessions(maxInactiveMinutes: number = 60): void {
  const now = Date.now();
  const maxInactiveMs = maxInactiveMinutes * 60 * 1000;

  for (const [channelId, session] of gameSessions.entries()) {
    if (now - session.lastActivity > maxInactiveMs) {
      gameSessions.delete(channelId);
      logger.info(`Session ${channelId} cleaned up due to inactivity`);
    }
  }
}

// Start periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(() => cleanupInactiveSessions(60), 10 * 60 * 1000);
}

/**
 * Get analytics data for all game sessions
 */
export function getAnalytics() {
  const now = Date.now();
  const sessions = Array.from(gameSessions.values());
  
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => now - s.lastActivity < 5 * 60 * 1000).length; // Active in last 5 min
  const totalPlayers = sessions.reduce((sum, s) => sum + s.players.length, 0);
  const totalSpectators = sessions.reduce((sum, s) => sum + s.spectators.length, 0);
  
  const sessionsByPhase = sessions.reduce((acc, s) => {
    acc[s.currentPhase] = (acc[s.currentPhase] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const sessionsByPlatform = sessions.reduce((acc, s) => {
    acc[s.platform] = (acc[s.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const avgPlayersPerSession = totalSessions > 0 ? totalPlayers / totalSessions : 0;
  const avgRoundPerSession = totalSessions > 0 
    ? sessions.reduce((sum, s) => sum + s.currentRound, 0) / totalSessions 
    : 0;
  
  // Top players by score (across all sessions)
  const allPlayers = sessions.flatMap(s => 
    s.players.map(p => ({
      id: p.id,
      username: p.discordUser.username,
      score: p.score,
      channelId: s.channelId
    }))
  );
  const topPlayers = allPlayers
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  return {
    overview: {
      totalSessions,
      activeSessions,
      totalPlayers,
      totalSpectators,
      avgPlayersPerSession: Math.round(avgPlayersPerSession * 10) / 10,
      avgRoundPerSession: Math.round(avgRoundPerSession * 10) / 10,
    },
    breakdown: {
      byPhase: sessionsByPhase,
      byPlatform: sessionsByPlatform,
    },
    topPlayers,
    sessions: sessions.map(s => ({
      channelId: s.channelId,
      platform: s.platform,
      phase: s.currentPhase,
      players: s.players.length,
      spectators: s.spectators.length,
      round: s.currentRound,
      totalRounds: s.totalRounds,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      uptime: now - s.createdAt,
    })),
    timestamp: now,
  };
}

// Export for backward compatibility
export { getRandomQuestions };
