import { describe, it, expect } from 'vitest';
import {
  getAvatarUrl,
  getDisplayName,
  DEFAULT_SETTINGS,
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
});
