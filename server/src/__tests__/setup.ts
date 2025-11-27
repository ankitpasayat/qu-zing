// Jest test setup file
import { jest, afterEach, afterAll } from '@jest/globals';

// Mock environment variables for testing
process.env.DISCORD_CLIENT_ID = 'test-client-id';
process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
process.env.DISCORD_PUBLIC_KEY = 'test-public-key';
process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests

// Global test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'user-' + Math.random().toString(36).substring(7),
  username: 'TestUser',
  discriminator: '0',
  avatar: null,
  globalName: 'Test User',
  platform: 'browser' as const,
  ...overrides,
});

export const createMockSession = (overrides = {}) => ({
  channelId: 'test-channel-' + Math.random().toString(36).substring(7),
  guildId: '',
  instanceId: '',
  platform: 'browser' as const,
  hostId: 'test-host',
  players: [],
  spectators: [],
  currentPhase: 'waiting' as const,
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

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Force exit after all tests complete to handle lingering async operations
afterAll(() => {
  // Clear any timers that may be running
  jest.useRealTimers();
});
