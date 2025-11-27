import { DiscordSDK } from '@discord/embedded-app-sdk';
import type { DiscordUser } from './types/game';

// Check if running in Discord iframe
const isInDiscord = window.self !== window.top;

// Initialize Discord SDK lazily - only when needed
let discordSdk: DiscordSDK | null = null;

let isReady = false;
let currentUser: DiscordUser | null = null;
let initPromise: Promise<{
  user: DiscordUser;
  channelId: string;
  guildId: string | null;
  instanceId: string;
}> | null = null;

console.log('🔍 Environment check:', {
  isInDiscord,
  hasClientId: !!import.meta.env.VITE_DISCORD_CLIENT_ID,
  clientIdValue: import.meta.env.VITE_DISCORD_CLIENT_ID ? import.meta.env.VITE_DISCORD_CLIENT_ID.substring(0, 10) + '...' : 'undefined',
  origin: window.location.origin,
  href: window.location.href,
  parentOrigin: window.parent !== window ? 'embedded' : 'standalone',
});

function getDiscordSdkInstance(): DiscordSDK {
  if (!discordSdk) {
    discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
  }
  return discordSdk;
}

// Force re-initialization (useful when exiting and rejoining)
// keepSdkState: if true, keeps the SDK authentication but clears app-level state
export function resetDiscordState(keepSdkState: boolean = false): void {
  if (!keepSdkState) {
    isReady = false;
    currentUser = null;
  }
  initPromise = null;
  console.log('🔄 Discord state reset', { keepSdkState, isReady, hasUser: !!currentUser });
}

export async function initializeDiscord(): Promise<{
  user: DiscordUser;
  channelId: string;
  guildId: string | null;
  instanceId: string;
}> {
  // If already initialized and have valid state, return cached data
  if (isReady && currentUser && discordSdk) {
    // Check if channelId is still valid (might have changed if Activity restarted)
    if (discordSdk.channelId) {
      console.log('✅ Discord already initialized, returning cached data');
      return {
        user: currentUser,
        channelId: discordSdk.channelId,
        guildId: discordSdk.guildId,
        instanceId: discordSdk.instanceId,
      };
    } else {
      // SDK state is stale, reset and re-init
      console.log('⚠️ Discord SDK state is stale, re-initializing...');
      resetDiscordState();
    }
  }

  // If we have cached user from keepSdkState reset, restore ready state
  if (!isReady && currentUser && discordSdk?.channelId) {
    console.log('✅ Restoring Discord state from cached data (post-exit)');
    isReady = true;
    return {
      user: currentUser,
      channelId: discordSdk.channelId,
      guildId: discordSdk.guildId,
      instanceId: discordSdk.instanceId,
    };
  }

  // If initialization is in progress, return the existing promise
  if (initPromise) {
    console.log('⏳ Discord initialization in progress, waiting...');
    return initPromise;
  }

  console.log('Initializing Discord SDK...');
  console.log('Client ID:', import.meta.env.VITE_DISCORD_CLIENT_ID);
  
  // Validate client ID before attempting initialization
  if (!import.meta.env.VITE_DISCORD_CLIENT_ID) {
    throw new Error('Discord Client ID not configured. Check your environment variables.');
  }

  // Create and store the initialization promise
  initPromise = (async () => {
    try {
      return await performInitialization();
    } catch (error) {
      console.error('❌ Discord initialization failed:', error);
      throw error;
    } finally {
      // Clear the promise after completion (success or failure)
      initPromise = null;
    }
  })();

  return initPromise;
}

async function performInitialization(): Promise<{
  user: DiscordUser;
  channelId: string;
  guildId: string | null;
  instanceId: string;
}> {
  // Check if running in Discord
  if (!isInDiscord) {
    const errorMsg = 'Not running inside Discord Activity. Please open this app from Discord Voice Channel → Activities.';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }
  
  console.log('🎮 Running inside Discord iframe, initializing SDK...');
  
  // Initialize Discord SDK now that we know we're in Discord
  let sdk: DiscordSDK;
  try {
    sdk = getDiscordSdkInstance();
    console.log('✅ Discord SDK instance created');
  } catch (sdkError) {
    console.error('❌ Failed to create Discord SDK instance:', sdkError);
    // Provide more specific error message
    const errorMessage = sdkError instanceof Error ? sdkError.message : 'Unknown error';
    throw new Error(`Failed to initialize Discord SDK: ${errorMessage}. Please try refreshing.`);
  }
  
  // Wait for Discord SDK to be ready with timeout
  console.log('Waiting for Discord SDK ready()...');
  const readyPromise = sdk.ready();
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Discord SDK initialization timeout after 15s. Make sure you opened this from Discord Activities.')), 15000)
  );
  
  try {
    await Promise.race([readyPromise, timeoutPromise]);
    console.log('✅ Discord SDK ready');
    console.log('Channel ID:', sdk.channelId);
    console.log('Guild ID:', sdk.guildId);
    console.log('Instance ID:', sdk.instanceId);
  } catch (error) {
    console.error('❌ Discord SDK ready() failed:', error);
    throw error;
  }
  
  // Verify we have required data from Discord
  if (!sdk.channelId) {
    throw new Error('Discord SDK ready but missing channelId. Please try restarting the activity.');
  }

  // Authorize with Discord
  console.log('Authorizing with Discord...');
  try {
    const { code } = await sdk.commands.authorize({
      client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'guilds'],
    });
    console.log('Authorization code received');

    // Exchange code for access token
    console.log('Exchanging code for access token...');
    const response = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const { access_token } = await response.json();
    console.log('Access token received');

    // Authenticate with Discord
    console.log('Authenticating with Discord...');
    const auth = await sdk.commands.authenticate({ access_token });
    console.log('Authentication successful');
    
    if (!auth.user) {
      throw new Error('Failed to authenticate with Discord');
    }

    currentUser = {
      id: auth.user.id,
      username: auth.user.username,
      discriminator: auth.user.discriminator || '0',
      avatar: auth.user.avatar ?? null,
      globalName: auth.user.global_name || null,
    };

    isReady = true;

    return {
      user: currentUser!,
      channelId: sdk.channelId!,
      guildId: sdk.guildId,
      instanceId: sdk.instanceId,
    };
  } catch (error: unknown) {
    // Handle "Already authing" error gracefully
    const err = error as { code?: number; message?: string };
    if (err?.code === 4002 || err?.message?.includes('Already authing')) {
      console.warn('⚠️ Authorization already in progress, waiting for completion...');
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      // The next call will use the cached result if successful
      throw new Error('Please refresh the page if the issue persists');
    }
    throw error;
  }
}

export function getDiscordSdk() {
  return discordSdk;
}

export function getCurrentUser() {
  return currentUser;
}

export function getChannelId() {
  return discordSdk?.channelId ?? null;
}

// Open Discord invite dialog
export async function inviteFriends() {
  try {
    if (!discordSdk) {
      console.warn('Discord SDK not initialized');
      return;
    }
    await discordSdk.commands.openInviteDialog();
  } catch (error) {
    console.error('Failed to open invite dialog:', error);
  }
}

// Get participants in the voice channel
export async function getParticipants() {
  if (!discordSdk?.channelId) return [];
  
  try {
    const { participants } = await discordSdk.commands.getInstanceConnectedParticipants();
    return participants;
  } catch {
    return [];
  }
}

// Subscribe to participant updates
export function onParticipantsChange(callback: (participants: unknown[]) => void) {
  if (!discordSdk) {
    console.warn('Discord SDK not initialized');
    return;
  }
  discordSdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (event) => {
    callback((event as { participants: unknown[] }).participants);
  });
}
