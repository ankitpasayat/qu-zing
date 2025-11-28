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

    it('handles image error by trying png fallback first', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'DiscordUser',
        discriminator: '1234',
        avatar: 'avatar_hash',
        globalName: 'DiscordUser',
      };
      
      render(<PlayerAvatar user={user} size={40} />);
      
      const img = screen.getByRole('img') as HTMLImageElement;
      
      // Set to webp to simulate the first load attempt
      img.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=80`;
      
      fireEvent.error(img);
      
      // After first error on webp, should try png
      expect(img.src).toContain('.png');
    });

    it('handles png error by trying jpg fallback', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'DiscordUser',
        discriminator: '1234',
        avatar: 'avatar_hash',
        globalName: 'DiscordUser',
      };
      
      render(<PlayerAvatar user={user} size={40} />);
      
      const img = screen.getByRole('img') as HTMLImageElement;
      
      // Set to png to simulate having already tried webp
      img.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=80`;
      
      fireEvent.error(img);
      
      // After png error, should try jpg
      expect(img.src).toContain('.jpg');
    });

    it('handles all format failures by falling back to default avatar', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'DiscordUser',
        discriminator: '1234',
        avatar: 'avatar_hash',
        globalName: 'DiscordUser',
      };
      
      render(<PlayerAvatar user={user} size={40} />);
      
      const img = screen.getByRole('img') as HTMLImageElement;
      
      // Set to jpg to simulate having already tried webp and png
      img.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg?size=80`;
      
      fireEvent.error(img);
      
      // After jpg error, should use embed/avatars default
      expect(img.src).toContain('embed/avatars');
    });

    it('uses discriminator-based default for legacy users', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'DiscordUser',
        discriminator: '1234',
        avatar: 'avatar_hash',
        globalName: 'DiscordUser',
      };
      
      render(<PlayerAvatar user={user} size={40} />);
      
      const img = screen.getByRole('img') as HTMLImageElement;
      
      // Set to a non-avatar URL that's not embed/avatars
      img.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg?size=80`;
      
      fireEvent.error(img);
      
      // Should use discriminator % 5 for legacy users
      expect(img.src).toContain('embed/avatars');
    });

    it('uses id-based default for new username system users', () => {
      const user: DiscordUser = {
        id: '123456789012345678',
        username: 'DiscordUser',
        discriminator: '0', // New username system
        avatar: 'avatar_hash',
        globalName: 'DiscordUser',
      };
      
      render(<PlayerAvatar user={user} size={40} />);
      
      const img = screen.getByRole('img') as HTMLImageElement;
      
      // Set to jpg to trigger fallback
      img.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg?size=80`;
      
      fireEvent.error(img);
      
      // Should use embed/avatars for new username system
      expect(img.src).toContain('embed/avatars');
    });

    it('does not change src if already using embed/avatars fallback', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'DiscordUser',
        discriminator: '1234',
        avatar: 'avatar_hash',
        globalName: 'DiscordUser',
      };
      
      render(<PlayerAvatar user={user} size={40} />);
      
      const img = screen.getByRole('img') as HTMLImageElement;
      
      // Set to default avatar
      img.src = 'https://cdn.discordapp.com/embed/avatars/4.png';
      
      const originalSrc = img.src;
      fireEvent.error(img);
      
      // Should remain the same - no more fallbacks
      expect(img.src).toBe(originalSrc);
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

    it('applies custom className', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'DiscordUser',
        discriminator: '1234',
        avatar: 'avatar_hash',
        globalName: 'DiscordUser',
      };
      
      render(<PlayerAvatar user={user} size={40} className="custom-class" />);
      
      const img = screen.getByRole('img');
      expect(img).toHaveClass('rounded-full', 'custom-class');
    });
  });

  describe('Discord Users without avatar', () => {
    it('uses default avatar when user has no avatar hash', () => {
      const user: DiscordUser = {
        id: '123456789',
        username: 'DiscordUser',
        discriminator: '1234',
        avatar: null, // No avatar
        globalName: 'DiscordUser',
      };
      
      render(<PlayerAvatar user={user} size={40} />);
      
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toContain('embed/avatars');
    });
  });
});
