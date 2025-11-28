import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectPlatform,
  generateLobbyCode,
  generateUserId,
  getBrowserUserData,
  updateBrowserUsername,
  getAvatarColor,
  copyToClipboard,
} from '../lib/platform';

describe('Platform Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn();
    localStorage.setItem = vi.fn();
  });

  describe('detectPlatform', () => {
    it('should detect browser when not in iframe', () => {
      // window.self === window.top when not in iframe
      Object.defineProperty(window, 'self', { value: window, writable: true });
      Object.defineProperty(window, 'top', { value: window, writable: true });
      
      expect(detectPlatform()).toBe('browser');
    });

    it('should detect discord when in iframe', () => {
      Object.defineProperty(window, 'self', { value: window, writable: true });
      Object.defineProperty(window, 'top', { value: {} as Window, writable: true });
      
      expect(detectPlatform()).toBe('discord');
    });
  });

  describe('generateLobbyCode', () => {
    it('should generate 6 character code', () => {
      const code = generateLobbyCode();
      expect(code).toHaveLength(6);
    });

    it('should only contain valid characters', () => {
      const code = generateLobbyCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateLobbyCode());
      }
      // Should have at least 90 unique codes out of 100
      expect(codes.size).toBeGreaterThan(90);
    });
  });

  describe('generateUserId', () => {
    it('should generate unique browser user IDs', () => {
      const id1 = generateUserId();
      const id2 = generateUserId();
      
      expect(id1).toMatch(/^browser_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('getBrowserUserData', () => {
    it('should return stored user data if valid', () => {
      const storedData = { id: 'test-id', username: 'TestUser' };
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(storedData));
      
      const result = getBrowserUserData();
      
      expect(result).toEqual(storedData);
    });

    it('should create new user if no data stored', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
      
      const result = getBrowserUserData();
      
      expect(result.id).toMatch(/^browser_/);
      expect(result.username).toMatch(/^Player\d+$/);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should create new user if stored data is invalid', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('invalid json');
      
      const result = getBrowserUserData();
      
      expect(result.id).toMatch(/^browser_/);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should create new user if stored data is incomplete', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({ id: 'test' }));
      
      const result = getBrowserUserData();
      
      expect(result.id).toMatch(/^browser_/);
    });
  });

  describe('updateBrowserUsername', () => {
    it('should update username in localStorage', () => {
      const storedData = { id: 'test-id', username: 'OldName' };
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(storedData));
      
      updateBrowserUsername('NewName');
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'trivia_user',
        expect.stringContaining('"username":"NewName"')
      );
    });
  });

  describe('getAvatarColor', () => {
    it('should return consistent color for same user ID', () => {
      const color1 = getAvatarColor('user123');
      const color2 = getAvatarColor('user123');
      
      expect(color1).toBe(color2);
    });

    it('should return different colors for different users', () => {
      const color1 = getAvatarColor('user1');
      const color2 = getAvatarColor('user2');
      const color3 = getAvatarColor('user3');
      
      // At least 2 should be different
      const colors = new Set([color1, color2, color3]);
      expect(colors.size).toBeGreaterThanOrEqual(2);
    });

    it('should return valid hex color', () => {
      const color = getAvatarColor('test');
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('copyToClipboard', () => {
    it('should copy text using clipboard API', async () => {
      const result = await copyToClipboard('test text');
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
      expect(result).toBe(true);
    });

    it('should return false on clipboard error', async () => {
      (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Clipboard error'));
      
      const result = await copyToClipboard('test');
      
      expect(result).toBe(false);
    });

    it('should use fallback when clipboard API is not available', async () => {
      // Save original
      const originalClipboard = navigator.clipboard;
      const originalExecCommand = document.execCommand;
      
      // Mock clipboard as unavailable
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true,
      });
      
      // Define execCommand since it may not exist in jsdom
      document.execCommand = vi.fn().mockReturnValue(true);
      
      // Mock document methods for fallback
      const mockTextarea = {
        value: '',
        style: { position: '', opacity: '' },
        select: vi.fn(),
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockTextarea as unknown as HTMLTextAreaElement);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockTextarea as unknown as HTMLElement);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockTextarea as unknown as HTMLElement);
      
      const result = await copyToClipboard('fallback test');
      
      expect(createElementSpy).toHaveBeenCalledWith('textarea');
      expect(document.execCommand).toHaveBeenCalledWith('copy');
      expect(result).toBe(true);
      
      // Restore
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
      document.execCommand = originalExecCommand;
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should return false when fallback fails', async () => {
      // Save original
      const originalClipboard = navigator.clipboard;
      const originalExecCommand = document.execCommand;
      
      // Mock clipboard as unavailable
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true,
      });
      
      // Define execCommand to return false (failure)
      document.execCommand = vi.fn().mockReturnValue(false);
      
      // Mock document methods
      const mockTextarea = {
        value: '',
        style: { position: '', opacity: '' },
        select: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockTextarea as unknown as HTMLTextAreaElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockTextarea as unknown as HTMLElement);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockTextarea as unknown as HTMLElement);
      
      const result = await copyToClipboard('will fail');
      
      expect(result).toBe(false);
      
      // Restore
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
      document.execCommand = originalExecCommand;
      vi.restoreAllMocks();
    });
  });
});
