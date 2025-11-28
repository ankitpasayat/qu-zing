import { describe, it, expect } from 'vitest';
import {
  getAvatarUrl,
  getDisplayName,
  DEFAULT_SETTINGS,
  getInitialPowerUps,
  isSpeedDemon,
  getStreakBonus,
  qualifiesForComebackBonus,
  canActivateGambit,
  getGambitReward,
  getTradeUpCost,
  getTradeDownResult,
  getHighestAvailableToken,
  generateTokenCounts,
  getAvailableTokens,
  calculateScore,
} from '../types/game';
import type { DiscordUser } from '../types/game';

describe('Game Types', () => {
  describe('getAvatarUrl', () => {
    it('should return custom avatar URL when user has avatar', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'TestUser',
        discriminator: '1234',
        avatar: 'abc123',
        globalName: 'Test User',
      };
      
      const url = getAvatarUrl(user, 64);
      
      expect(url).toBe('https://cdn.discordapp.com/avatars/123456789/abc123?size=64');
    });

    it('should return default avatar URL when user has no avatar', () => {
      const user: DiscordUser = {
        id: '123456789012345678',
        username: 'TestUser',
        discriminator: '0',
        avatar: null,
        globalName: 'Test User',
      };
      
      const url = getAvatarUrl(user);
      
      expect(url).toMatch(/^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/\d\.png$/);
    });

    it('should use discriminator for default avatar with legacy accounts', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'TestUser',
        discriminator: '1234',
        avatar: null,
        globalName: null,
      };
      
      const url = getAvatarUrl(user);
      
      // 1234 % 5 = 4
      expect(url).toBe('https://cdn.discordapp.com/embed/avatars/4.png');
    });

    it('should use custom size parameter', () => {
      const user: DiscordUser = {
        id: '123',
        username: 'Test',
        discriminator: '0',
        avatar: 'avatar123',
        globalName: null,
      };
      
      const url = getAvatarUrl(user, 128);
      
      expect(url).toContain('size=128');
    });
  });

  describe('getDisplayName', () => {
    it('should return globalName when available', () => {
      const user: DiscordUser = {
        id: '123',
        username: 'testuser',
        discriminator: '0',
        avatar: null,
        globalName: 'Display Name',
      };
      
      expect(getDisplayName(user)).toBe('Display Name');
    });

    it('should return username when globalName is null', () => {
      const user: DiscordUser = {
        id: '123',
        username: 'testuser',
        discriminator: '0',
        avatar: null,
        globalName: null,
      };
      
      expect(getDisplayName(user)).toBe('testuser');
    });

    it('should return username when globalName is empty', () => {
      const user: DiscordUser = {
        id: '123',
        username: 'fallback',
        discriminator: '0',
        avatar: null,
        globalName: '',
      };
      
      expect(getDisplayName(user)).toBe('fallback');
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have all required settings', () => {
      expect(DEFAULT_SETTINGS).toHaveProperty('totalRounds');
      expect(DEFAULT_SETTINGS).toHaveProperty('questionTimeLimit');
      expect(DEFAULT_SETTINGS).toHaveProperty('allowMidGameJoin');
      expect(DEFAULT_SETTINGS).toHaveProperty('showLeaderboardDuringGame');
      expect(DEFAULT_SETTINGS).toHaveProperty('categories');
      expect(DEFAULT_SETTINGS).toHaveProperty('timeBetweenQuestions');
      expect(DEFAULT_SETTINGS).toHaveProperty('timeToAnswer');
      expect(DEFAULT_SETTINGS).toHaveProperty('timeToViewAnswer');
    });

    it('should have sensible default values', () => {
      expect(DEFAULT_SETTINGS.totalRounds).toBe(10);
      expect(DEFAULT_SETTINGS.timeToAnswer).toBe(10);
      expect(DEFAULT_SETTINGS.allowMidGameJoin).toBe(true);
    });
  });

  describe('getInitialPowerUps', () => {
    it('should return array with all 3 power-ups unused', () => {
      const powerUps = getInitialPowerUps();

      expect(powerUps).toHaveLength(3);
      expect(powerUps.find(p => p.type === 'double-down')).toEqual({ type: 'double-down', used: false });
      expect(powerUps.find(p => p.type === 'safety-net')).toEqual({ type: 'safety-net', used: false });
      expect(powerUps.find(p => p.type === '50-50')).toEqual({ type: '50-50', used: false });
    });

    it('should return new array each time', () => {
      const powerUps1 = getInitialPowerUps();
      const powerUps2 = getInitialPowerUps();

      expect(powerUps1).not.toBe(powerUps2);
    });
  });

  describe('isSpeedDemon', () => {
    it('should return true if answered in under 3 seconds', () => {
      const votingStartedAt = 1000;
      expect(isSpeedDemon(votingStartedAt, votingStartedAt + 2000)).toBe(true);
      expect(isSpeedDemon(votingStartedAt, votingStartedAt + 1000)).toBe(true);
      expect(isSpeedDemon(votingStartedAt, votingStartedAt + 2999)).toBe(true);
    });

    it('should return false if answered in 3+ seconds', () => {
      const votingStartedAt = 1000;
      expect(isSpeedDemon(votingStartedAt, votingStartedAt + 3001)).toBe(false);
      expect(isSpeedDemon(votingStartedAt, votingStartedAt + 5000)).toBe(false);
      expect(isSpeedDemon(votingStartedAt, votingStartedAt + 10000)).toBe(false);
    });

    it('should return false for null voting phase start time', () => {
      expect(isSpeedDemon(null, 5000)).toBe(false);
    });
  });

  describe('getStreakBonus', () => {
    it('should return 0 for streak under 2', () => {
      expect(getStreakBonus(0)).toBe(0);
      expect(getStreakBonus(1)).toBe(0);
    });

    it('should return increasing bonus for streaks 2+', () => {
      expect(getStreakBonus(2)).toBe(1);
      expect(getStreakBonus(3)).toBe(2);
      expect(getStreakBonus(4)).toBe(3);
      expect(getStreakBonus(5)).toBe(3); // caps at 3
    });
  });

  describe('qualifiesForComebackBonus', () => {
    it('should return true when player is in bottom 50%', () => {
      const allScores = [100, 50, 25];

      expect(qualifiesForComebackBonus(25, allScores)).toBe(true);
    });

    it('should return false when player is in top 50%', () => {
      const allScores = [100, 50, 25];

      expect(qualifiesForComebackBonus(100, allScores)).toBe(false);
      expect(qualifiesForComebackBonus(50, allScores)).toBe(false);
    });

    it('should return false for single player', () => {
      expect(qualifiesForComebackBonus(100, [100])).toBe(false);
    });

    it('should return false for empty scores array', () => {
      expect(qualifiesForComebackBonus(100, [])).toBe(false);
    });
  });

  describe('canActivateGambit', () => {
    it('should return true when on 3rd-to-last round', () => {
      expect(canActivateGambit(8, 10)).toBe(true); // Round 8 of 10 = 3rd-to-last
      expect(canActivateGambit(3, 5)).toBe(true);  // Round 3 of 5 = 3rd-to-last
    });

    it('should return false when not on 3rd-to-last round', () => {
      expect(canActivateGambit(7, 10)).toBe(false);
      expect(canActivateGambit(9, 10)).toBe(false);
      expect(canActivateGambit(10, 10)).toBe(false);
    });
  });

  describe('getGambitReward', () => {
    it('should return 2x the stake token value', () => {
      expect(getGambitReward(3)).toBe(6);  // 3 * 2
      expect(getGambitReward(5)).toBe(10); // 5 * 2
      expect(getGambitReward(10)).toBe(20); // 10 * 2
    });
  });

  describe('getTradeUpCost', () => {
    it('should return required tokens and resulting value', () => {
      const result = getTradeUpCost(5);
      expect(result.required).toBe(2); // Need 2 tokens of value-1
      expect(result.value).toBe(4);    // Trade 2x 4-value for 1x 5-value
    });
  });

  describe('getTradeDownResult', () => {
    it('should return count and value of resulting tokens', () => {
      const result = getTradeDownResult(6);
      expect(result.count).toBe(2);  // Get 2 tokens
      expect(result.value).toBe(3);  // Each worth floor(6/2) = 3
    });
  });

  describe('getHighestAvailableToken', () => {
    it('should return highest token from counts', () => {
      expect(getHighestAvailableToken({ 1: 1, 5: 1, 3: 2 })).toBe(5);
      expect(getHighestAvailableToken({ 10: 1, 2: 3 })).toBe(10);
    });

    it('should ignore tokens with 0 count', () => {
      expect(getHighestAvailableToken({ 1: 1, 5: 0, 3: 2 })).toBe(3);
    });

    it('should return 0 for empty token counts', () => {
      expect(getHighestAvailableToken({})).toBe(0);
    });

    it('should return 0 when all counts are 0', () => {
      expect(getHighestAvailableToken({ 1: 0, 5: 0 })).toBe(0);
    });
  });

  describe('generateTokenCounts', () => {
    it('should generate base tokens (1-10) for 10 rounds', () => {
      const counts = generateTokenCounts(10);
      
      for (let i = 1; i <= 10; i++) {
        expect(counts[i]).toBe(1);
      }
    });

    it('should generate extra tokens starting from 10 for rounds > 10', () => {
      const counts = generateTokenCounts(12);
      
      // Base tokens
      for (let i = 1; i <= 8; i++) {
        expect(counts[i]).toBe(1);
      }
      // Extra tokens for 10 and 9
      expect(counts[10]).toBe(2);
      expect(counts[9]).toBe(2);
    });

    it('should handle 15 rounds with wrap-around', () => {
      const counts = generateTokenCounts(15);
      
      // 5 extra tokens: 10, 9, 8, 7, 6 each get +1
      expect(counts[10]).toBe(2);
      expect(counts[9]).toBe(2);
      expect(counts[8]).toBe(2);
      expect(counts[7]).toBe(2);
      expect(counts[6]).toBe(2);
      // Lower values stay at 1
      expect(counts[5]).toBe(1);
      expect(counts[1]).toBe(1);
    });

    it('should handle 20+ rounds with multiple wrap-arounds', () => {
      const counts = generateTokenCounts(20);
      
      // 10 extra tokens = full wrap-around, all get +1
      for (let i = 1; i <= 10; i++) {
        expect(counts[i]).toBe(2);
      }
    });
  });

  describe('getAvailableTokens', () => {
    it('should return sorted array of available tokens', () => {
      const tokens = getAvailableTokens({ 1: 1, 3: 2, 5: 1 });
      
      expect(tokens).toEqual([1, 3, 5]);
    });

    it('should exclude tokens with 0 count', () => {
      const tokens = getAvailableTokens({ 1: 1, 2: 0, 3: 1 });
      
      expect(tokens).toEqual([1, 3]);
    });

    it('should return empty array when no tokens available', () => {
      const tokens = getAvailableTokens({});
      
      expect(tokens).toEqual([]);
    });

    it('should return all tokens 1-10 when all available', () => {
      const counts: Record<number, number> = {};
      for (let i = 1; i <= 10; i++) {
        counts[i] = 1;
      }
      
      const tokens = getAvailableTokens(counts);
      
      expect(tokens).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  describe('calculateScore', () => {
    it('should return base score for simple token', () => {
      const result = calculateScore(5, {});
      
      expect(result.baseScore).toBe(5);
      expect(result.finalScore).toBe(5);
      expect(result.doubleDown).toBe(false);
      expect(result.comebackBonus).toBe(false);
      expect(result.streakBonus).toBe(0);
      expect(result.speedDemonBonus).toBe(0);
    });

    it('should double score with double-down power-up', () => {
      const result = calculateScore(5, { doubleDown: true });
      
      expect(result.baseScore).toBe(5);
      expect(result.doubleDown).toBe(true);
      expect(result.finalScore).toBe(10);
    });

    it('should apply comeback bonus multiplier', () => {
      const result = calculateScore(10, { qualifiesForComeback: true });
      
      expect(result.comebackBonus).toBe(true);
      // Comeback multiplier is 1.2x: Math.floor(10 * 1.2) = 12
      expect(result.finalScore).toBe(12);
    });

    it('should add streak bonus for streak count >= 2', () => {
      const result = calculateScore(5, { streakCount: 3 });
      
      expect(result.streakBonus).toBe(2); // streak of 3 gives +2
      expect(result.finalScore).toBe(7); // 5 + 2
    });

    it('should add speed demon bonus', () => {
      const result = calculateScore(5, { isSpeedDemon: true });
      
      expect(result.speedDemonBonus).toBe(2); // SPEED_DEMON_BONUS is 2
      expect(result.finalScore).toBe(7); // 5 + 2
    });

    it('should combine all bonuses correctly', () => {
      const result = calculateScore(5, {
        doubleDown: true,
        qualifiesForComeback: true,
        streakCount: 2,
        isSpeedDemon: true,
      });
      
      // base: 5
      // double-down: 10
      // comeback (1.2x): Math.floor(10 * 1.2) = 12
      // streak bonus (2): +1
      // speed demon: +2
      // total: 12 + 1 + 2 = 15
      expect(result.baseScore).toBe(5);
      expect(result.doubleDown).toBe(true);
      expect(result.comebackBonus).toBe(true);
      expect(result.streakBonus).toBe(1);
      expect(result.speedDemonBonus).toBe(2);
      expect(result.finalScore).toBe(15);
    });
  });
});
