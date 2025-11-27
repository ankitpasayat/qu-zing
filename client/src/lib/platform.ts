/**
 * Platform detection and session management for Discord and Browser modes
 */

export type Platform = 'discord' | 'browser';

export interface PlatformContext {
  platform: Platform;
  sessionId: string; // Discord channelId or browser lobby code
  userId: string;
  username: string;
  userAvatar: string | null;
}

/**
 * Detect if running inside Discord Activity
 */
export function detectPlatform(): Platform {
  // Check if running in Discord iframe
  const isInDiscord = window.self !== window.top;
  return isInDiscord ? 'discord' : 'browser';
}

/**
 * Generate a random lobby code for browser sessions
 */
export function generateLobbyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a random user ID for browser users
 */
export function generateUserId(): string {
  return `browser_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get or create browser user data from localStorage
 */
export function getBrowserUserData(): { id: string; username: string } {
  const stored = localStorage.getItem('trivia_user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.id && parsed.username) {
        return parsed;
      }
    } catch {
      // Invalid data, create new
    }
  }

  // Create new user
  const id = generateUserId();
  const username = `Player${Math.floor(Math.random() * 9999)}`;
  const userData = { id, username };
  localStorage.setItem('trivia_user', JSON.stringify(userData));
  return userData;
}

/**
 * Update browser username
 */
export function updateBrowserUsername(username: string): void {
  const userData = getBrowserUserData();
  userData.username = username;
  localStorage.setItem('trivia_user', JSON.stringify(userData));
}

/**
 * Get random avatar color for browser users
 */
export function getAvatarColor(userId: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ];
  
  // Simple hash to get consistent color for same userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
