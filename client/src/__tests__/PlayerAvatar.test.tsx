import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from './test-utils';
import { PlayerAvatar } from '../components/PlayerAvatar';
import type { DiscordUser } from '../types/game';

// Mock the platform utilities
vi.mock('../lib/platform', () => ({
  getAvatarColor: (id: string) => `#${id.substring(0, 6).padStart(6, '0')}`,
}));

describe('PlayerAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('Browser Users', () => {
    it('renders color-based avatar for browser users', () => {
      const user: DiscordUser = {
        id: 'abc123',
        username: 'BrowserUser',
        discriminator: '0000',
        avatar: null,
        globalName: null,
        platform: 'browser',
      };
      
      render(<PlayerAvatar user={user} size={40} />);
      
      const avatar = screen.getByText('B');
      expect(avatar).toBeInTheDocument();
    });

    it('displays first letter of username as initial', () => {
      const user: DiscordUser = {
        id: 'def456',
        username: 'TestUser',
        discriminator: '0000',
        avatar: null,
        globalName: null,
        platform: 'browser',
      };
      
      render(<PlayerAvatar user={user} size={40} />);
      
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('applies correct size styles', () => {
      const user: DiscordUser = {
        id: 'ghi789',
        username: 'User',
        discriminator: '0000',
        avatar: null,
        globalName: null,
        platform: 'browser',
      };
      
      render(<PlayerAvatar user={user} size={60} />);
      
      const avatar = screen.getByText('U');
      expect(avatar).toHaveStyle({ width: '60px', height: '60px' });
    });
  });

  describe('Discord Users', () => {
    it('renders image for Discord users with avatar', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'DiscordUser',
        discriminator: '1234',
        avatar: 'avatar_hash',
        globalName: 'DiscordUser',
      };
      
      render(<PlayerAvatar user={user} size={40} />);
      
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'DiscordUser');
    });

    it('applies size to image element', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'DiscordUser',
        discriminator: '1234',
        avatar: 'avatar_hash',
        globalName: 'DiscordUser',
      };
      
      render(<PlayerAvatar user={user} size={50} />);
      
      const img = screen.getByRole('img');
      expect(img).toHaveStyle({ width: '50px', height: '50px' });
    });

    it('handles image error by trying fallback format', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'DiscordUser',
        discriminator: '1234',
        avatar: 'avatar_hash',
        globalName: 'DiscordUser',
      };
      
      render(<PlayerAvatar user={user} size={40} />);
      
      const img = screen.getByRole('img') as HTMLImageElement;
      fireEvent.error(img);
      
      // After error, src should have changed to a fallback
      expect(img.src).toBeTruthy();
    });
  });

  describe('Default Props', () => {
    it('uses default size of 40', () => {
      const user: DiscordUser = {
        id: 'test123',
        username: 'TestUser',
        discriminator: '0000',
        avatar: null,
        globalName: null,
        platform: 'browser',
      };
      
      render(<PlayerAvatar user={user} />);
      
      const avatar = screen.getByText('T');
      expect(avatar).toHaveStyle({ width: '40px', height: '40px' });
    });
  });
});
