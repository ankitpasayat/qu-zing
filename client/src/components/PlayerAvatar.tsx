import type { DiscordUser } from '../types/game';
import { getAvatarUrl } from '../types/game';
import { getAvatarColor } from '../lib/platform';

interface PlayerAvatarProps {
  user: DiscordUser;
  size?: number;
  className?: string;
}

export function PlayerAvatar({ user, size = 40, className = '' }: PlayerAvatarProps) {
  // Browser users get color-based avatars with initials
  if (user.platform === 'browser') {
    const color = getAvatarColor(user.id);
    const initial = user.username.charAt(0).toUpperCase();
    
    return (
      <div
        className={`rounded-full flex items-center justify-center font-bold text-white ${className}`}
        style={{ 
          width: size, 
          height: size,
          backgroundColor: color,
          fontSize: size * 0.5
        }}
      >
        {initial}
      </div>
    );
  }
  
  // Discord users get their Discord avatars
  const avatarUrl = getAvatarUrl(user, size * 2);
  
  console.log('🖼️ Loading avatar:', {
    username: user.username,
    userId: user.id,
    avatarHash: user.avatar,
    url: avatarUrl,
    testUrls: [
      `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`,
      `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`,
      `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg?size=128`,
    ]
  });
  
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    
    // Try fallback formats: webp -> png -> jpg -> default
    if (user.avatar && img.src.includes('.webp')) {
      console.log('❌ Webp failed, trying png for:', user.username);
      img.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size * 2}`;
    } else if (user.avatar && img.src.includes('.png') && !img.src.includes('embed/avatars')) {
      console.log('❌ Png failed, trying jpg for:', user.username);
      img.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg?size=${size * 2}`;
    } else if (!img.src.includes('embed/avatars')) {
      console.log('❌ All formats failed, using fallback for:', user.username, user.avatar);
      const defaultIndex = user.discriminator === '0' 
        ? Number((BigInt(user.id) >> 22n) % 6n)
        : parseInt(user.discriminator) % 5;
      img.src = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }
  };

  return (
    <img
      src={avatarUrl}
      alt={user.username}
      width={size}
      height={size}
      onError={handleError}
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
