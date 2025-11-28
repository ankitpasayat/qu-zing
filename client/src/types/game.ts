// Game types for Qu-Zing! - Discord Activity & Browser Edition

export type GamePhase = 'waiting' | 'lobby' | 'question' | 'voting' | 'reveal' | 'results';

export type Platform = 'discord' | 'browser';

// Power-up types from GAME_MECHANICS.md
export type PowerUpType = 'double-down' | 'safety-net' | '50-50';

export interface PowerUp {
  type: PowerUpType;
  used: boolean;
}

// Initial power-ups given to each player
export function getInitialPowerUps(): PowerUp[] {
  return [
    { type: 'double-down', used: false },
    { type: 'safety-net', used: false },
    { type: '50-50', used: false },
  ];
}

// Endgame Gambit state
export interface GambitState {
  isActive: boolean;
  startedAtRound: number;
  stakeTokenValue: number;
  consecutiveCorrect: number;
  completed: boolean;
  won: boolean;
}

// Streak state for Streak Fire mechanic
export interface StreakState {
  current: number;
  best: number;
}

// User info - supports both Discord and browser users
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  globalName: string | null;
  platform?: Platform; // 'discord' or 'browser'
}

/**
 * Player state in a game session.
 * 
 * @breaking API Change: `availableTokens: number[]` was replaced with `tokenCounts: Record<number, number>`
 * in order to support stacked tokens for games with >10 rounds. The new structure maps
 * token values (1-10) to their available count. Use `getAvailableTokens(tokenCounts)`
 * to get a sorted array of available token values for backwards compatibility.
 * Existing player sessions will be invalidated on deployment.
 */
export interface Player {
  id: string; // Discord user ID
  discordUser: DiscordUser;
  score: number;
  tokenCounts: Record<number, number>; // token value -> count available (supports stacked tokens for >10 rounds)
  usedTokens: number[]; // tokens that have been played and scored
  isHost: boolean;
  isConnected: boolean;
  isSpectator: boolean; // true if joined mid-game
  joinedAt: number;
  
  // New game mechanics
  powerUps: PowerUp[];
  streak: StreakState;
  gambit: GambitState | null;
  lastAnswerTime: number | null;
}

// Helper to generate initial token counts based on total rounds
// Extra rounds add duplicates starting from highest value (10) down
export function generateTokenCounts(totalRounds: number): Record<number, number> {
  const counts: Record<number, number> = {};
  
  if (totalRounds < 10) {
    // Only create tokens up to totalRounds
    for (let i = 1; i <= totalRounds; i++) {
      counts[i] = 1;
    }
  } else {
    // Base: 1 of each token 1-10
    for (let i = 1; i <= 10; i++) {
      counts[i] = 1;
    }
    
    // Extra tokens for rounds > 10, starting from 10 and going down
    let extraTokens = totalRounds - 10;
    let tokenValue = 10;
    
    while (extraTokens > 0 && tokenValue >= 1) {
      counts[tokenValue]++;
      extraTokens--;
      tokenValue--;
      if (tokenValue < 1) tokenValue = 10; // Wrap around for 20+ rounds
    }
  }
  
  return counts;
}

// Helper to get available tokens as sorted array (for UI)
export function getAvailableTokens(tokenCounts: Record<number, number>): number[] {
  const tokens: number[] = [];
  for (let i = 1; i <= 10; i++) {
    if (tokenCounts[i] > 0) {
      tokens.push(i);
    }
  }
  return tokens;
}

export type QuestionType = 'multiple-choice' | 'true-false' | 'more-or-less' | 'numerical';

export interface BaseQuestion {
  id: string;
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correctAnswer: number; // index of correct option (0-3)
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false';
  correctAnswer: boolean;
}

export interface MoreOrLessQuestion extends BaseQuestion {
  type: 'more-or-less';
  option1: string;
  option2: string;
  correctAnswer: 0 | 1;
}

export interface NumericalQuestion extends BaseQuestion {
  type: 'numerical';
  correctAnswer: number;
  unit?: string;
  acceptableRange?: number;
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | MoreOrLessQuestion | NumericalQuestion;

export interface PlayerVote {
  playerId: string;
  answer: number | boolean;
  token: number;
  submittedAt: number;
  powerUpUsed: PowerUpType | null;
  eliminatedOptions: number[] | null;
}

export interface GameSession {
  // Session identifiers - works for both Discord and browser
  channelId: string; // Voice channel ID (Discord) or lobby code (browser) - this IS our session ID
  guildId: string; // Discord guild ID or empty string for browser
  instanceId: string; // Activity instance ID (Discord) or empty string for browser
  platform: Platform; // 'discord' or 'browser'
  
  // Game state
  hostId: string; // Discord user ID of current host
  players: Player[];
  spectators: Player[]; // Players who joined mid-game
  currentPhase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentQuestion: Question | null;
  votes: PlayerVote[];
  questionHistory: Question[];
  isGeneratingQuestions: boolean; // true when fetching questions from AI
  
  // Settings (configurable by host)
  settings: GameSettings;
  
  // Timestamps
  createdAt: number;
  lastActivity: number;
  roundStartedAt: number | null; // When the round started (question phase)
  questionPhaseStartedAt: number | null; // When question display phase started
  votingPhaseStartedAt: number | null; // When voting phase started
  revealPhaseStartedAt: number | null; // When reveal phase started
}

export interface GameSettings {
  totalRounds: number;
  questionTimeLimit: number; // seconds, 0 = no limit (deprecated, use timeToAnswer)
  allowMidGameJoin: boolean;
  showLeaderboardDuringGame: boolean;
  categories: string[]; // empty = all categories
  timeBetweenQuestions: number; // seconds before showing next question
  timeToAnswer: number; // seconds to vote on answer
  timeToViewAnswer: number; // seconds to view correct answer and results
}

export const DEFAULT_SETTINGS: GameSettings = {
  totalRounds: 10,
  questionTimeLimit: 0,
  allowMidGameJoin: true,
  showLeaderboardDuringGame: true,
  categories: [],
  timeBetweenQuestions: 5,
  timeToAnswer: 10,
  timeToViewAnswer: 5,
};

// Solo mode for single players
export interface SoloGameState {
  isActive: boolean;
  currentStreak: number;
  bestStreak: number;
  questionsAnswered: number;
  correctAnswers: number;
}

// API types
export interface JoinSessionRequest {
  channelId: string; // Voice channel ID (Discord) or lobby code (browser)
  guildId: string; // Discord guild ID or empty string for browser
  instanceId: string; // Activity instance ID (Discord) or empty string for browser
  user: DiscordUser;
  platform: Platform; // 'discord' or 'browser'
}

export interface JoinSessionResponse {
  success: boolean;
  session: GameSession;
  playerId: string;
  isNewSession: boolean;
}

export interface GameEvent {
  type: 
    | 'player_joined' 
    | 'player_left' 
    | 'game_started' 
    | 'phase_changed' 
    | 'vote_submitted' 
    | 'round_complete'
    | 'host_changed'
    | 'settings_changed'
    | 'player_reconnected';
  session: GameSession;
  timestamp: number;
  payload?: Record<string, unknown>;
}

// Helper to get avatar URL
export function getAvatarUrl(user: DiscordUser, size = 64): string {
  // Browser users use color-based avatars
  if (user.platform === 'browser' || !user.avatar) {
    if (user.platform === 'browser') {
      // Return empty string - we'll handle browser avatars differently
      return '';
    }
    // Default Discord avatar based on discriminator or user id
    const defaultIndex = user.discriminator === '0' 
      ? (BigInt(user.id) >> 22n) % 6n 
      : parseInt(user.discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
  
  // Discord user with custom avatar
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}?size=${size}`;
}

// Helper to get display name
export function getDisplayName(user: DiscordUser): string {
  return user.globalName || user.username;
}

// ============================================
// Game Mechanics Helpers (from GAME_MECHANICS.md)
// ============================================

// Speed Demon: Check if answer was submitted within 3 seconds
export const SPEED_DEMON_THRESHOLD_MS = 3000;
export const SPEED_DEMON_BONUS = 2;

export function isSpeedDemon(votingPhaseStartedAt: number | null, submittedAt: number): boolean {
  if (!votingPhaseStartedAt) return false;
  return submittedAt - votingPhaseStartedAt <= SPEED_DEMON_THRESHOLD_MS;
}

// Streak Fire: Calculate streak bonus
export function getStreakBonus(streakCount: number): number {
  if (streakCount < 2) return 0;
  if (streakCount === 2) return 1;
  if (streakCount === 3) return 2;
  return 3; // 4+ streak
}

// Comeback Bonus: Check if player qualifies (bottom 50%)
export const COMEBACK_MULTIPLIER = 1.2;

export function qualifiesForComebackBonus(playerScore: number, allScores: number[]): boolean {
  if (allScores.length <= 1) return false;
  const sortedScores = [...allScores].sort((a, b) => b - a);
  const playerRank = sortedScores.indexOf(playerScore);
  const bottomHalfThreshold = Math.ceil(sortedScores.length / 2);
  return playerRank >= bottomHalfThreshold;
}

// Gambit: Check if gambit can be activated (3rd-to-last round)
export function canActivateGambit(currentRound: number, totalRounds: number): boolean {
  return currentRound === totalRounds - 2; // 3rd-to-last round
}

// Gambit: Calculate gambit reward
export function getGambitReward(stakeTokenValue: number): number {
  return stakeTokenValue * 2; // 2x stake value
}

// Token Trading: Calculate trade values
// Combine (Fuse): Trade 2 tokens of value N for 1 token of value min(2N, 10)
export function getCombineResult(sourceValue: number): { required: number; value: number } {
  return { required: 2, value: Math.min(sourceValue * 2, 10) };
}

// Split (Fission): Trade 1 token of value N for 2 tokens: floor(N/2) and ceil(N/2)
export function getSplitResult(sourceValue: number): { count: number; values: [number, number] } {
  const val1 = Math.floor(sourceValue / 2);
  const val2 = Math.ceil(sourceValue / 2);
  return { count: 2, values: [val1, val2] };
}

/**
 * @deprecated This function uses the OLD trading mechanic (2 tokens of N-1 → 1 token of N).
 * The NEW mechanic uses getCombineResult (2 tokens of N → 1 token of 2N, capped at 10).
 * These are NOT equivalent - migrate to getCombineResult for new code.
 */
export function getTradeUpCost(targetValue: number): { required: number; value: number } {
  return { required: 2, value: targetValue - 1 };
}

/**
 * @deprecated This function uses the OLD trading mechanic (1 token → 2 tokens of floor(N/2)).
 * The NEW mechanic uses getSplitResult (1 token of N → 2 tokens of floor(N/2) and ceil(N/2)).
 * getSplitResult preserves total value better for odd numbers.
 */
export function getTradeDownResult(sourceValue: number): { count: number; value: number } {
  return { count: 2, value: Math.floor(sourceValue / 2) };
}

// Get highest value token available
export function getHighestAvailableToken(tokenCounts: Record<number, number>): number {
  const available = getAvailableTokens(tokenCounts);
  return available.length > 0 ? Math.max(...available) : 0;
}

// Calculate total score with all multipliers and bonuses
export interface ScoreCalculation {
  baseScore: number;
  doubleDown: boolean;
  comebackBonus: boolean;
  streakBonus: number;
  speedDemonBonus: number;
  finalScore: number;
}

export function calculateScore(
  tokenValue: number,
  options: {
    doubleDown?: boolean;
    qualifiesForComeback?: boolean;
    streakCount?: number;
    isSpeedDemon?: boolean;
  }
): ScoreCalculation {
  const baseScore = tokenValue;
  let multipliedScore = baseScore;
  
  if (options.doubleDown) {
    multipliedScore *= 2;
  }
  
  if (options.qualifiesForComeback) {
    multipliedScore = Math.floor(multipliedScore * COMEBACK_MULTIPLIER);
  }
  
  const streakBonus = getStreakBonus(options.streakCount || 0);
  const speedDemonBonus = options.isSpeedDemon ? SPEED_DEMON_BONUS : 0;
  
  const finalScore = multipliedScore + streakBonus + speedDemonBonus;
  
  return {
    baseScore,
    doubleDown: options.doubleDown || false,
    comebackBonus: options.qualifiesForComeback || false,
    streakBonus,
    speedDemonBonus,
    finalScore,
  };
}
