import {
  getInitialPowerUps,
  isSpeedDemon,
  getStreakBonus,
  qualifiesForComebackBonus,
  canActivateGambit,
  getGambitReward,
  getTradeUpCost,
  getTradeDownResult,
  getHighestAvailableToken,
  calculateScore,
  generateTokenCounts,
  getAvailableTokens,
  SPEED_DEMON_THRESHOLD_MS,
  SPEED_DEMON_BONUS,
  COMEBACK_MULTIPLIER,
} from '../types/game.js';

describe('Game Mechanics', () => {
  describe('Power-ups', () => {
    describe('getInitialPowerUps', () => {
      it('should return 3 power-ups: double-down, safety-net, and 50-50', () => {
        const powerUps = getInitialPowerUps();
        
        expect(powerUps).toHaveLength(3);
        expect(powerUps).toContainEqual({ type: 'double-down', used: false });
        expect(powerUps).toContainEqual({ type: 'safety-net', used: false });
        expect(powerUps).toContainEqual({ type: '50-50', used: false });
      });

      it('should return all power-ups as unused', () => {
        const powerUps = getInitialPowerUps();
        expect(powerUps.every(p => p.used === false)).toBe(true);
      });
    });
  });

  describe('Speed Demon', () => {
    describe('isSpeedDemon', () => {
      it('should return true if answer submitted within 3 seconds', () => {
        const votingStart = 1000;
        const submittedAt = 1000 + 2000; // 2 seconds later
        
        expect(isSpeedDemon(votingStart, submittedAt)).toBe(true);
      });

      it('should return true if answer submitted exactly at 3 seconds', () => {
        const votingStart = 1000;
        const submittedAt = 1000 + SPEED_DEMON_THRESHOLD_MS;
        
        expect(isSpeedDemon(votingStart, submittedAt)).toBe(true);
      });

      it('should return false if answer submitted after 3 seconds', () => {
        const votingStart = 1000;
        const submittedAt = 1000 + 3001; // 3.001 seconds later
        
        expect(isSpeedDemon(votingStart, submittedAt)).toBe(false);
      });

      it('should return false if votingPhaseStartedAt is null', () => {
        expect(isSpeedDemon(null, Date.now())).toBe(false);
      });
    });
  });

  describe('Streak Fire', () => {
    describe('getStreakBonus', () => {
      it('should return 0 for streak < 2', () => {
        expect(getStreakBonus(0)).toBe(0);
        expect(getStreakBonus(1)).toBe(0);
      });

      it('should return 1 for streak of 2', () => {
        expect(getStreakBonus(2)).toBe(1);
      });

      it('should return 2 for streak of 3', () => {
        expect(getStreakBonus(3)).toBe(2);
      });

      it('should return 3 for streak of 4 or more', () => {
        expect(getStreakBonus(4)).toBe(3);
        expect(getStreakBonus(5)).toBe(3);
        expect(getStreakBonus(10)).toBe(3);
      });
    });
  });

  describe('Comeback Bonus', () => {
    describe('qualifiesForComebackBonus', () => {
      it('should return false for single player', () => {
        expect(qualifiesForComebackBonus(10, [10])).toBe(false);
      });

      it('should return false for top 50% of players', () => {
        const scores = [100, 80, 60, 40]; // 4 players
        expect(qualifiesForComebackBonus(100, scores)).toBe(false); // 1st place
        expect(qualifiesForComebackBonus(80, scores)).toBe(false); // 2nd place (top 50%)
      });

      it('should return true for bottom 50% of players', () => {
        const scores = [100, 80, 60, 40]; // 4 players
        expect(qualifiesForComebackBonus(60, scores)).toBe(true); // 3rd place
        expect(qualifiesForComebackBonus(40, scores)).toBe(true); // 4th place
      });

      it('should handle odd number of players correctly', () => {
        const scores = [100, 80, 60]; // 3 players, bottom 50% = last player only with ceil()
        expect(qualifiesForComebackBonus(100, scores)).toBe(false); // 1st
        expect(qualifiesForComebackBonus(80, scores)).toBe(false); // 2nd (not in bottom 50% with ceil)
        expect(qualifiesForComebackBonus(60, scores)).toBe(true); // 3rd (bottom 50%)
      });

      it('should handle tied scores', () => {
        const scores = [100, 50, 50, 25];
        // First occurrence of 50 would be at index 1, which is top 50%
        expect(qualifiesForComebackBonus(50, scores)).toBe(false);
      });
    });
  });

  describe('Endgame Gambit', () => {
    describe('canActivateGambit', () => {
      it('should return true at 3rd-to-last round', () => {
        expect(canActivateGambit(8, 10)).toBe(true); // Round 8 of 10
        expect(canActivateGambit(3, 5)).toBe(true); // Round 3 of 5
        expect(canActivateGambit(13, 15)).toBe(true); // Round 13 of 15
      });

      it('should return false at other rounds', () => {
        expect(canActivateGambit(7, 10)).toBe(false); // Too early
        expect(canActivateGambit(9, 10)).toBe(false); // 2nd-to-last
        expect(canActivateGambit(10, 10)).toBe(false); // Last round
        expect(canActivateGambit(1, 10)).toBe(false); // First round
      });
    });

    describe('getGambitReward', () => {
      it('should return 2x the stake value', () => {
        expect(getGambitReward(10)).toBe(20);
        expect(getGambitReward(5)).toBe(10);
        expect(getGambitReward(1)).toBe(2);
      });
    });
  });

  describe('Token Trading', () => {
    describe('getTradeUpCost', () => {
      it('should return 2 tokens of value N-1 for target N', () => {
        expect(getTradeUpCost(5)).toEqual({ required: 2, value: 4 });
        expect(getTradeUpCost(10)).toEqual({ required: 2, value: 9 });
        expect(getTradeUpCost(2)).toEqual({ required: 2, value: 1 });
      });
    });

    describe('getTradeDownResult', () => {
      it('should return 2 tokens of value floor(N/2)', () => {
        expect(getTradeDownResult(10)).toEqual({ count: 2, value: 5 });
        expect(getTradeDownResult(9)).toEqual({ count: 2, value: 4 });
        expect(getTradeDownResult(5)).toEqual({ count: 2, value: 2 });
        expect(getTradeDownResult(3)).toEqual({ count: 2, value: 1 });
      });
    });

    describe('getHighestAvailableToken', () => {
      it('should return the highest token with count > 0', () => {
        const tokenCounts = { 1: 0, 2: 1, 3: 0, 4: 2, 5: 0, 6: 0, 7: 1, 8: 0, 9: 0, 10: 0 };
        expect(getHighestAvailableToken(tokenCounts)).toBe(7);
      });

      it('should return 0 if no tokens available', () => {
        const tokenCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
        expect(getHighestAvailableToken(tokenCounts)).toBe(0);
      });

      it('should return 10 if all tokens available', () => {
        const tokenCounts = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 };
        expect(getHighestAvailableToken(tokenCounts)).toBe(10);
      });
    });
  });

  describe('Score Calculation', () => {
    describe('calculateScore', () => {
      it('should return base token value with no modifiers', () => {
        const result = calculateScore(5, {});
        
        expect(result.baseScore).toBe(5);
        expect(result.doubleDown).toBe(false);
        expect(result.comebackBonus).toBe(false);
        expect(result.streakBonus).toBe(0);
        expect(result.speedDemonBonus).toBe(0);
        expect(result.finalScore).toBe(5);
      });

      it('should apply Double Down (x2)', () => {
        const result = calculateScore(5, { doubleDown: true });
        
        expect(result.doubleDown).toBe(true);
        expect(result.finalScore).toBe(10);
      });

      it('should apply Comeback Bonus (x1.2)', () => {
        const result = calculateScore(5, { qualifiesForComeback: true });
        
        expect(result.comebackBonus).toBe(true);
        expect(result.finalScore).toBe(6); // floor(5 * 1.2) = 6
      });

      it('should apply Streak Bonus', () => {
        const result = calculateScore(5, { streakCount: 3 });
        
        expect(result.streakBonus).toBe(2);
        expect(result.finalScore).toBe(7); // 5 + 2
      });

      it('should apply Speed Demon Bonus', () => {
        const result = calculateScore(5, { isSpeedDemon: true });
        
        expect(result.speedDemonBonus).toBe(2);
        expect(result.finalScore).toBe(7); // 5 + 2
      });

      it('should apply all multipliers and bonuses correctly', () => {
        const result = calculateScore(5, {
          doubleDown: true,
          qualifiesForComeback: true,
          streakCount: 4,
          isSpeedDemon: true,
        });
        
        // base: 5
        // after double down: 10
        // after comeback (x1.2): floor(12) = 12
        // streak bonus (4+): +3
        // speed demon: +2
        // final: 12 + 3 + 2 = 17
        expect(result.finalScore).toBe(17);
      });

      it('should apply multipliers before bonuses', () => {
        const result = calculateScore(10, {
          doubleDown: true,
          streakCount: 2,
        });
        
        // base: 10
        // after double down: 20
        // streak bonus (2): +1
        // final: 20 + 1 = 21
        expect(result.finalScore).toBe(21);
      });
    });
  });

  describe('Constants', () => {
    it('SPEED_DEMON_THRESHOLD_MS should be 3000', () => {
      expect(SPEED_DEMON_THRESHOLD_MS).toBe(3000);
    });

    it('SPEED_DEMON_BONUS should be 2', () => {
      expect(SPEED_DEMON_BONUS).toBe(2);
    });

    it('COMEBACK_MULTIPLIER should be 1.2', () => {
      expect(COMEBACK_MULTIPLIER).toBe(1.2);
    });
  });

  describe('Token Generation', () => {
    describe('generateTokenCounts', () => {
      it('should generate only tokens up to totalRounds when < 10', () => {
        const counts5 = generateTokenCounts(5);
        
        // Only tokens 1-5 should exist
        expect(counts5[1]).toBe(1);
        expect(counts5[2]).toBe(1);
        expect(counts5[3]).toBe(1);
        expect(counts5[4]).toBe(1);
        expect(counts5[5]).toBe(1);
        // Tokens 6-10 should not exist
        expect(counts5[6]).toBeUndefined();
        expect(counts5[10]).toBeUndefined();
      });

      it('should generate base tokens (1-10) for exactly 10 rounds', () => {
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

      it('should handle edge case of 1 round', () => {
        const counts = generateTokenCounts(1);
        
        expect(counts[1]).toBe(1);
        expect(counts[2]).toBeUndefined();
      });
    });

    describe('getAvailableTokens', () => {
      it('should return sorted array of available tokens', () => {
        const tokens = getAvailableTokens({ 1: 1, 3: 2, 5: 1 });
        
        expect(tokens).toEqual([1, 3, 5]);
      });

      it('should exclude tokens with 0 count', () => {
        const tokens = getAvailableTokens({ 1: 1, 2: 0, 3: 1, 4: 0, 5: 1 });
        
        expect(tokens).toEqual([1, 3, 5]);
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

      it('should handle partial token set from < 10 round game', () => {
        const counts = generateTokenCounts(5);
        const tokens = getAvailableTokens(counts);
        
        expect(tokens).toEqual([1, 2, 3, 4, 5]);
      });
    });
  });
});
