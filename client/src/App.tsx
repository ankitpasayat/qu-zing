import { useState, useEffect, useCallback, useRef } from 'react';
import { initializeDiscord, inviteFriends, resetDiscordState } from './discord';
import { useGameEvents, useGameApi } from './hooks/useGameEvents';
import { Lobby } from './components/Lobby';
import { GamePlay } from './components/GamePlay';
import { Results } from './components/Results';
import { DebugOverlay } from './components/DebugOverlay';
import { BrowserLobby } from './components/BrowserLobby';
import { PWAInstallPrompt, PWAUpdatePrompt } from './components/PWAPrompts';
import { initDebugLogger } from './lib/debugLogger';
import { detectPlatform, generateLobbyCode, getBrowserUserData, updateBrowserUsername } from './lib/platform';
import Analytics from './pages/Analytics';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import type { DiscordUser, Player, GameSettings, GameSession, Platform } from './types/game';

// Initialize debug logger
initDebugLogger();

// Use relative URL to leverage Vite proxy in dev, or direct URL in production
const API_BASE = import.meta.env.VITE_API_URL || '';

// Check if this is a static page route outside component
const currentPath = window.location.pathname;
const isAnalyticsRoute = currentPath === '/analytics';
const isTermsRoute = currentPath === '/terms-of-service' || currentPath === '/terms';
const isPrivacyRoute = currentPath === '/privacy-policy' || currentPath === '/privacy';

function App() {
  // Handle analytics route early but after hooks are set up
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [discordData, setDiscordData] = useState<{
    user: DiscordUser;
    channelId: string;
    guildId: string | null;
    instanceId: string;
  } | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [showBrowserLobbySetup, setShowBrowserLobbySetup] = useState(false);
  const initSucceededRef = useRef(false);

  // Initialize Discord and join game
  const initDiscord = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🚀 Starting Discord initialization...');
      console.log('Discord Client ID:', import.meta.env.VITE_DISCORD_CLIENT_ID);
      console.log('API Base:', API_BASE);
      
      const data = await initializeDiscord();
      
      console.log('✅ Discord initialized:', data);
      setDiscordData(data);
      setPlayerId(data.user.id);
      
      // Initial session will be received via Socket.IO after connection
      // The useGameEvents hook will handle the Socket.IO connection and join
      initSucceededRef.current = true;
      console.log('✅ Discord initialized, Socket.IO will handle join');
    } catch (err) {
      console.error('❌ Initialization error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize';
      const errorCode = (err as { code?: number })?.code;
      const isAlreadyAuthError = errorMessage.includes('Already authing') || errorCode === 4002;
      
      if (isAlreadyAuthError) {
        console.log('ℹ️ "Already authing" error detected, retrying in 2s...');
        // Retry after a short delay - use a flag to prevent recursion issues
        setTimeout(() => {
          if (!initSucceededRef.current) {
            // Manually trigger retry by resetting state
            setIsLoading(true);
            initializeDiscord().then(data => {
              setDiscordData(data);
              setPlayerId(data.user.id);
              initSucceededRef.current = true;
            }).catch(retryErr => {
              console.error('❌ Retry failed:', retryErr);
              setError(retryErr instanceof Error ? retryErr.message : 'Failed to initialize');
            }).finally(() => {
              setIsLoading(false);
            });
          }
        }, 2000);
      } else if (!initSucceededRef.current) {
        console.error('❌ Setting error state:', errorMessage);
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Detect platform and initialize
  useEffect(() => {
    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);
    
    if (detectedPlatform === 'browser') {
      // Check for lobby code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const lobbyCode = urlParams.get('lobby');
      
      if (lobbyCode) {
        // Auto-join flow - show browser lobby setup to join
        setShowBrowserLobbySetup(true);
        setIsLoading(false);
      } else {
        // Show browser lobby creation/join menu
        setShowBrowserLobbySetup(true);
        setIsLoading(false);
      }
    } else {
      // Discord mode - proceed with Discord initialization
      initDiscord();
    }
  }, [initDiscord]);

  // Browser mode: Create lobby
  const handleCreateBrowserLobby = async (username: string) => {
    try {
      setIsLoading(true);
      updateBrowserUsername(username);
      
      const userData = getBrowserUserData();
      const lobbyCode = generateLobbyCode();
      
      const user: DiscordUser = {
        id: userData.id,
        username: userData.username,
        discriminator: '0',
        avatar: null,
        globalName: null,
        platform: 'browser',
      };

      // Set data for Socket.IO connection (it will auto-join)
      setDiscordData({
        user,
        channelId: lobbyCode,
        guildId: '',
        instanceId: '',
      });
      setPlayerId(userData.id);
      setShowBrowserLobbySetup(false);
      console.log('✅ Browser lobby created, Socket.IO will connect:', lobbyCode);
      
    } catch (err) {
      console.error('Failed to create lobby:', err);
      setError(err instanceof Error ? err.message : 'Failed to create lobby');
    } finally {
      setIsLoading(false);
    }
  };

  // Browser mode: Join lobby
  const handleJoinBrowserLobby = async (lobbyCode: string, username: string) => {
    try {
      setIsLoading(true);
      updateBrowserUsername(username);
      
      const userData = getBrowserUserData();
      
      const user: DiscordUser = {
        id: userData.id,
        username: userData.username,
        discriminator: '0',
        avatar: null,
        globalName: null,
        platform: 'browser',
      };

      // Set data for Socket.IO connection (it will auto-join)
      setDiscordData({
        user,
        channelId: lobbyCode,
        guildId: '',
        instanceId: '',
      });
      setPlayerId(userData.id);
      setShowBrowserLobbySetup(false);
      console.log('✅ Joining lobby via Socket.IO:', lobbyCode);
      
    } catch (err) {
      console.error('Failed to join lobby:', err);
      setError(err instanceof Error ? err.message : 'Failed to join lobby');
    } finally {
      setIsLoading(false);
    }
  };

  const [initialSession, setInitialSession] = useState<GameSession | null>(null);
  // Optimistic settings state - immediately reflects user changes before server confirms
  const [optimisticSettings, setOptimisticSettings] = useState<Partial<GameSettings> | null>(null);
  // Track pending settings to know when server has confirmed them
  const pendingSettingsRef = useRef<Partial<GameSettings> | null>(null);

  const handleGameUpdate = useCallback((updatedSession: GameSession) => {
    // Only clear optimistic settings if the server state now matches what we sent
    // This prevents the UI from flickering back to old values
    if (pendingSettingsRef.current && updatedSession.settings) {
      const pending = pendingSettingsRef.current;
      const serverSettings = updatedSession.settings;
      
      // Check if all pending settings have been applied by the server
      const allApplied = Object.entries(pending).every(
        ([key, value]) => serverSettings[key as keyof GameSettings] === value
      );
      
      if (allApplied) {
        pendingSettingsRef.current = null;
        setOptimisticSettings(null);
      }
    }
  }, []);

  const { session, isConnected, error: connectionError, socket } = useGameEvents({
    channelId: discordData?.channelId ?? null,
    playerId,
    onUpdate: handleGameUpdate,
    initialSession,
    guildId: discordData?.guildId ?? '',
    instanceId: discordData?.instanceId ?? '',
    user: discordData?.user,
    platform: platform ?? 'discord',
  });

  const api = useGameApi(discordData?.channelId ?? null, socket);

  // Memoized callback for updating settings - prevents Lobby re-renders
  const handleUpdateSettings = useCallback((settings: Partial<GameSettings>) => {
    // Optimistically update settings immediately for smooth UI
    setOptimisticSettings(prev => ({ ...prev, ...settings }));
    // Track what we're sending so we know when server confirms
    pendingSettingsRef.current = { ...pendingSettingsRef.current, ...settings };
    // Fire and forget - server will broadcast the confirmed state
    api.updateSettings(playerId!, settings).catch(err => {
      console.error('Failed to update settings:', err);
      // Revert optimistic update on error
      pendingSettingsRef.current = null;
      setOptimisticSettings(null);
    });
  }, [api, playerId]);

  // Handle exiting the game gracefully
  const handleExitGame = useCallback(async () => {
    if (!playerId) return;
    
    try {
      console.log('🚪 Exiting game...');
      await api.exitGame(playerId);
      
      // Reset state to return to lobby
      setDiscordData(null);
      setPlayerId(null);
      setInitialSession(null);
      
      if (platform === 'browser') {
        // Browser mode - show lobby setup again
        setShowBrowserLobbySetup(true);
        // Clear lobby code from URL
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        // Discord mode - reset app state but keep SDK authentication
        // The SDK is already authenticated, we just need to rejoin the session
        resetDiscordState(true); // Keep SDK state to avoid re-authorization
        initSucceededRef.current = false;
        initDiscord();
      }
    } catch (err) {
      console.error('Failed to exit game:', err);
    }
  }, [playerId, platform, api, initDiscord]);

  // Find current player
  const currentPlayer = session?.players.find((p: Player) => p.id === playerId) 
    ?? session?.spectators.find((p: Player) => p.id === playerId);
  const isHost = currentPlayer?.isHost ?? false;

  // Debug logging
  useEffect(() => {
    console.log('🔍 App State:', {
      isLoading,
      error,
      hasDiscordData: !!discordData,
      playerId,
      hasSession: !!session,
      sessionPhase: session?.currentPhase,
      playerCount: session?.players.length,
      isConnected,
      connectionError,
      currentPlayer: currentPlayer ? { id: currentPlayer.id, isHost: currentPlayer.isHost } : null,
    });
  }, [isLoading, error, discordData, playerId, session, isConnected, connectionError, currentPlayer]);

  // Analytics route - render after all hooks are called
  if (isAnalyticsRoute) {
    return <Analytics />;
  }

  // Terms of Service route
  if (isTermsRoute) {
    return <TermsOfService />;
  }

  // Privacy Policy route
  if (isPrivacyRoute) {
    return <PrivacyPolicy />;
  }

  // Browser lobby setup
  if (showBrowserLobbySetup && platform === 'browser') {
    const urlParams = new URLSearchParams(window.location.search);
    const lobbyCodeFromUrl = urlParams.get('lobby');
    
    return (
      <>
        <BrowserLobby
          onCreateLobby={handleCreateBrowserLobby}
          onJoinLobby={(code, username) => {
            // Use code from URL if available, otherwise use provided code
            handleJoinBrowserLobby(lobbyCodeFromUrl || code, username);
          }}
        />
        <DebugOverlay />
      </>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] transition-colors duration-300">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">{platform === 'discord' ? 'Connecting...' : 'Loading...'}</p>
          </div>
        </div>
        <DebugOverlay />
      </>
    );
  }

  // Error state
  if (error) {
    const isDiscordError = error.includes('Discord') || error.includes('Activity');
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] p-4 transition-colors duration-300">
          <div className="text-center max-w-2xl">
            <div className="text-red-500 text-5xl mb-4">{isDiscordError ? '🚫' : '⚠️'}</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {isDiscordError ? 'Discord Activity Not Available' : 'Something went wrong'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-line">{error}</p>
            {isDiscordError && (
              <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-purple-800 dark:text-purple-200 text-sm font-semibold mb-2">How to use this app:</p>
                <ol className="text-purple-700 dark:text-purple-300 text-sm space-y-1 list-decimal list-inside">
                  <li>Join a voice channel in Discord</li>
                  <li>Click the Activities button (🚀 rocket icon)</li>
                  <li>Select "Qu-Zing!" from the list</li>
                  <li>The game will launch inside Discord</li>
                </ol>
              </div>
            )}
            <button 
              onClick={() => {
                setError(null);
                setIsLoading(false);
                window.location.reload();
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
            >
              Try Again
            </button>
          </div>
        </div>
        <DebugOverlay />
      </>
    );
  }

  // Waiting for session
  if (!session || !currentPlayer) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] transition-colors duration-300">
          <div className="text-center">
            <div className="animate-pulse h-12 w-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Joining game...</p>
          </div>
        </div>
        <DebugOverlay />
      </>
    );
  }

  // Connection status indicator
  const connectionIndicator = !isConnected && connectionError && (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-yellow-500/20 border border-yellow-500 text-yellow-200 px-4 py-2 rounded-xl text-sm z-50 backdrop-blur-sm">
      {connectionError}
    </div>
  );

  // Render based on game phase
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] text-gray-900 dark:text-white transition-colors duration-300">
      {connectionIndicator}
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      
      {/* Waiting/Lobby phase */}
      {(session.currentPhase === 'waiting' || session.currentPhase === 'lobby') && (
        <Lobby
          session={session}
          currentPlayer={currentPlayer}
          isHost={isHost}
          isStartingGame={api.isLoading}
          onStartGame={async () => {
            try {
              const result = await api.startGame(playerId!);
              console.log('🎮 Start game result:', result);
              // Update session immediately from API response
              if (result.success && result.session) {
                setInitialSession(result.session);
              }
            } catch (err) {
              console.error('Failed to start game:', err);
            }
          }}
          onInviteFriends={platform === 'discord' ? inviteFriends : () => {
            // Browser mode - share lobby link
            const url = `${window.location.origin}?lobby=${session.channelId}`;
            if (navigator.share) {
              navigator.share({ 
                title: 'Join my Qu-Zing! game!',
                text: `Join my trivia game with code: ${session.channelId}`,
                url 
              }).catch(() => {});
            }
          }}
          onUpdateSettings={handleUpdateSettings}
          optimisticSettings={optimisticSettings}
          onExitGame={handleExitGame}
          onCancelGeneration={async () => {
            try {
              const result = await api.cancelGeneration(playerId!);
              console.log('🛑 Cancel generation result:', result);
              if (result.success && result.session) {
                setInitialSession(result.session);
              }
            } catch (err) {
              console.error('Failed to cancel generation:', err);
            }
          }}
        />
      )}

      {/* Question/Voting/Reveal phases */}
      {['question', 'voting', 'reveal'].includes(session.currentPhase) && (
        <GamePlay
          session={session}
          currentPlayer={currentPlayer}
          isHost={isHost}
          onChangePhase={async (phase: string) => {
            try {
              const result = await api.changePhase(playerId!, phase);
              // Update session immediately from API response
              if (result.success && result.session) {
                setInitialSession(result.session);
              }
            } catch (err) {
              console.error('Failed to change phase:', err);
            }
          }}
          onSubmitVote={async (answer: number | boolean, token: number) => {
            try {
              const result = await api.submitVote(playerId!, answer, token);
              // Update session immediately from API response
              if (result.success && result.session) {
                setInitialSession(result.session);
              }
            } catch (err) {
              console.error('Failed to submit vote:', err);
            }
          }}
          onAutoVote={async (targetPlayerId: string) => {
            try {
              const result = await api.autoVote(targetPlayerId);
              // Update session immediately from API response
              if (result.success && result.session) {
                setInitialSession(result.session);
              }
            } catch (err) {
              console.error('Failed to auto-vote:', err);
            }
          }}
          onExitGame={handleExitGame}
        />
      )}

      {/* Results phase */}
      {session.currentPhase === 'results' && (
        <Results
          session={session}
          currentPlayer={currentPlayer}
          isHost={isHost}
          isStartingGame={api.isLoading}
          onPlayAgain={async () => {
            try {
              // Use atomic play again operation that resets and starts in one call
              const result = await api.playAgain(playerId!);
              console.log('🎮 Play again result:', result);
              if (result.success && result.session) {
                setInitialSession(result.session);
              }
            } catch (err) {
              console.error('Failed to play again:', err);
            }
          }}
          onCancelPlayAgain={async () => {
            try {
              const result = await api.cancelGeneration(playerId!);
              console.log('🛑 Cancel play again result:', result);
              if (result.success && result.session) {
                setInitialSession(result.session);
              }
            } catch (err) {
              console.error('Failed to cancel play again:', err);
            }
          }}
          onExitGame={handleExitGame}
        />
      )}

      {/* Debug overlay */}
      <DebugOverlay />
    </div>
  );
}

export default App;
