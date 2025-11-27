// Game types for Qu-Zing! - Discord Activity & Browser Edition

export type GamePhase = 'waiting' | 'lobby' | 'question' | 'voting' | 'reveal' | 'results';

export type Platform = 'discord' | 'browser';

// User info - supports both Discord and browser users
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  globalName: string | null;
  platform?: Platform;
}

export interface Player {
  id: string; // Discord user ID
  discordUser: DiscordUser;
  score: number;
  availableTokens: number[]; // tokens 1-10 that haven't been used
  usedTokens: number[]; // tokens that have been played and scored
  isHost: boolean;
  isConnected: boolean;
  isSpectator: boolean; // true if joined mid-game
  joinedAt: number;
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
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
  }
  // Default avatar based on discriminator or user id
  const defaultIndex = user.discriminator === '0' 
    ? (BigInt(user.id) >> 22n) % 6n 
    : parseInt(user.discriminator) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

// Helper to get display name
export function getDisplayName(user: DiscordUser): string {
  return user.globalName || user.username;
}
