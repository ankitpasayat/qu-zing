import { getAvatarUrl, getDisplayName, DEFAULT_SETTINGS } from '../types/game.js';
import type { DiscordUser } from '../types/game.js';

describe('Game Types', () => {
  describe('getAvatarUrl', () => {
    it('should return custom avatar URL when avatar is present', () => {
      const user: DiscordUser = {
        id: '123456789012345678',
        username: 'TestUser',
        discriminator: '0',
        avatar: 'abc123',
        globalName: 'Test User',
      };

      const url = getAvatarUrl(user);
      expect(url).toBe('https://cdn.discordapp.com/avatars/123456789012345678/abc123.png?size=64');
    });

    it('should return custom avatar URL with specified size', () => {
      const user: DiscordUser = {
        id: '123456789012345678',
        username: 'TestUser',
        discriminator: '0',
        avatar: 'abc123',
        globalName: 'Test User',
      };

      const url = getAvatarUrl(user, 128);
      expect(url).toBe('https://cdn.discordapp.com/avatars/123456789012345678/abc123.png?size=128');
    });

    it('should return default avatar URL when avatar is null (discriminator 0)', () => {
      const user: DiscordUser = {
        id: '123456789012345678',
        username: 'TestUser',
        discriminator: '0',
        avatar: null,
        globalName: 'Test User',
      };

      const url = getAvatarUrl(user);
      expect(url).toMatch(/https:\/\/cdn\.discordapp\.com\/embed\/avatars\/\d\.png/);
    });

    it('should return default avatar URL based on discriminator for legacy users', () => {
      const user: DiscordUser = {
        id: '123456789012345678',
        username: 'TestUser',
        discriminator: '1234',
        avatar: null,
        globalName: 'Test User',
      };

      const url = getAvatarUrl(user);
      const expectedIndex = 1234 % 5;
      expect(url).toBe(`https://cdn.discordapp.com/embed/avatars/${expectedIndex}.png`);
    });
  });

  describe('getDisplayName', () => {
    it('should return globalName when present', () => {
      const user: DiscordUser = {
        id: '123',
        username: 'testuser',
        discriminator: '0',
        avatar: null,
        globalName: 'Test Display Name',
      };

      expect(getDisplayName(user)).toBe('Test Display Name');
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
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SETTINGS).toEqual({
        totalRounds: 10,
        questionTimeLimit: 0,
        allowMidGameJoin: true,
        showLeaderboardDuringGame: true,
        categories: [],
        timeBetweenQuestions: 5,
        timeToAnswer: 10,
        timeToViewAnswer: 5,
      });
    });
  });
});
