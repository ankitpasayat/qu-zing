import { useMemo, memo } from 'react';
import type { GameSession, Player, GameSettings } from '../types/game';
import { getDisplayName } from '../types/game';
import { PlayerAvatar } from './PlayerAvatar';
import { LobbyCodeDisplay } from './BrowserLobby';
import { ComicLogo } from './ComicLogo';
import { ThemeToggle } from './ThemeToggle';

// Memoized settings panel to prevent re-renders causing layout shifts
const SettingsPanel = memo(function SettingsPanel({
  settings,
  onUpdateSettings,
}: {
  settings: GameSettings;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
}) {
  return (
    <div className="w-full max-w-sm mb-6 p-4 bg-white/70 dark:bg-[#231942]/50 rounded-xl border-2 border-purple-200/50 dark:border-purple-700/30">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">⚙️ Game Settings</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 dark:text-gray-300">Rounds</label>
          <select 
            value={settings.totalRounds}
            onChange={(e) => onUpdateSettings({ totalRounds: parseInt(e.target.value) })}
            className="bg-purple-50 dark:bg-[#1a1033] border border-purple-200 dark:border-purple-700/50 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
          >
            <option value={5}>5 rounds</option>
            <option value={10}>10 rounds</option>
            <option value={15}>15 rounds</option>
            <option value={20}>20 rounds</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 dark:text-gray-300">Time to read question</label>
          <select 
            value={settings.timeBetweenQuestions}
            onChange={(e) => onUpdateSettings({ timeBetweenQuestions: parseInt(e.target.value) })}
            className="bg-purple-50 dark:bg-[#1a1033] border border-purple-200 dark:border-purple-700/50 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
          >
            <option value={3}>3 sec</option>
            <option value={5}>5 sec</option>
            <option value={7}>7 sec</option>
            <option value={10}>10 sec</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 dark:text-gray-300">Time to answer</label>
          <select 
            value={settings.timeToAnswer}
            onChange={(e) => onUpdateSettings({ timeToAnswer: parseInt(e.target.value) })}
            className="bg-purple-50 dark:bg-[#1a1033] border border-purple-200 dark:border-purple-700/50 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
          >
            <option value={5}>5 sec</option>
            <option value={10}>10 sec</option>
            <option value={15}>15 sec</option>
            <option value={20}>20 sec</option>
            <option value={30}>30 sec</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 dark:text-gray-300">Time to view answer</label>
          <select 
            value={settings.timeToViewAnswer}
            onChange={(e) => onUpdateSettings({ timeToViewAnswer: parseInt(e.target.value) })}
            className="bg-purple-50 dark:bg-[#1a1033] border border-purple-200 dark:border-purple-700/50 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white"
          >
            <option value={3}>3 sec</option>
            <option value={5}>5 sec</option>
            <option value={7}>7 sec</option>
            <option value={10}>10 sec</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 dark:text-gray-300">Mid-game joins</label>
          <button
            onClick={() => onUpdateSettings({ allowMidGameJoin: !settings.allowMidGameJoin })}
            className={`w-12 h-6 rounded-full transition-colors ${
              settings.allowMidGameJoin ? 'bg-purple-500' : 'bg-gray-300 dark:bg-purple-900/50'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
              settings.allowMidGameJoin ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
});

interface LobbyProps {
  session: GameSession;
  currentPlayer: Player;
  isHost: boolean;
  isStartingGame?: boolean;
  onStartGame: () => void;
  onInviteFriends: () => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onExitGame?: () => void;
  onCancelGeneration?: () => void;
  optimisticSettings?: Partial<GameSettings> | null;
}

export function Lobby({ 
  session, 
  currentPlayer, 
  isHost, 
  isStartingGame = false,
  onStartGame, 
  onInviteFriends,
  onUpdateSettings,
  onExitGame,
  onCancelGeneration,
  optimisticSettings
}: LobbyProps) {
  const playerCount = session.players.length;
  const isSoloPlayer = playerCount === 1;
  const isBrowserMode = session.platform === 'browser';
  
  // Memoize display settings to prevent unnecessary re-renders
  // Cast to full GameSettings since we're merging with session.settings
  const displaySettings = useMemo(() => ({
    ...session.settings,
    ...optimisticSettings
  } as GameSettings), [session.settings, optimisticSettings]);

  return (
    <div className="min-h-screen flex flex-col p-4 safe-area-inset bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] text-gray-900 dark:text-white transition-colors duration-300">
      <ThemeToggle />
      {/* Exit button (browser mode only) */}
      {isBrowserMode && (
        <button
          onClick={onExitGame}
          className="absolute top-4 left-4 p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors z-10"
          title="Leave lobby"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      )}
      {/* Header */}
      <div className="text-center py-4">
        <ComicLogo size="md" />
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Test what you know. Win with confidence.</p>
      </div>

      {/* Players Grid */}
      <div className="flex-1 flex flex-col items-center justify-start pt-4 max-w-2xl mx-auto w-full">
        {/* Lobby Code (Browser mode only) */}
        {isBrowserMode && <LobbyCodeDisplay lobbyCode={session.channelId} />}
        
        {/* Current Players */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Players ({playerCount})
            </span>
            {isSoloPlayer && (
              <span className="text-xs text-amber-600 dark:text-yellow-400 animate-pulse">
                Solo mode available!
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {session.players.map((player) => (
              <div 
                key={player.id}
                className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                  ${player.id === currentPlayer.id 
                    ? 'bg-amber-100 dark:bg-amber-500/10 border-amber-400 dark:border-amber-500/50' 
                    : 'bg-white/80 dark:bg-[#231942]/50 border-purple-200/50 dark:border-purple-700/30'
                  }
                  ${!player.isConnected ? 'opacity-50' : ''}
                `}
              >
                <PlayerAvatar user={player.discordUser} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">
                    {getDisplayName(player.discordUser)}
                  </p>
                  {player.isHost && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Host</span>
                  )}
                </div>
                <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Invite Friends Button (Discord only) */}
        {!isBrowserMode && (
          <button
            onClick={onInviteFriends}
            className="w-full max-w-sm mb-6 py-4 px-6 bg-white/50 dark:bg-[#231942]/50 hover:bg-white/70 dark:hover:bg-[#2d1f4e]/70 border-2 border-dashed border-purple-300/50 dark:border-purple-700/50 hover:border-amber-400 dark:hover:border-purple-500 rounded-xl flex items-center justify-center gap-3 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">👋</span>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Invite Friends</span>
          </button>
        )}

        {/* Settings (Host only) - using memoized component */}
        {isHost && (
          <SettingsPanel 
            settings={displaySettings} 
            onUpdateSettings={onUpdateSettings} 
          />
        )}

        {/* Start/Waiting */}
        {isHost ? (
          <div className="w-full max-w-sm">
            <button
              onClick={onStartGame}
              disabled={isStartingGame || session.isGeneratingQuestions}
              className="comic-button w-full py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {(isStartingGame || session.isGeneratingQuestions) ? (
                <span className="flex flex-col items-center justify-center gap-1">
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating questions...
                  </span>
                  <span className="text-xs opacity-70">This may take a few seconds</span>
                </span>
              ) : (
                isSoloPlayer ? '🎮 Start Solo Game' : '🎮 Start Game'
              )}
            </button>
            {session.isGeneratingQuestions && onCancelGeneration && (
              <button
                onClick={onCancelGeneration}
                className="w-full mt-2 py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 border border-red-500/40 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm text-center py-4 px-6 bg-white/70 dark:bg-[#231942]/50 rounded-xl border-2 border-purple-200/50 dark:border-purple-700/30">
            {session.isGeneratingQuestions ? (
              <span className="flex flex-col items-center gap-2 text-purple-600 dark:text-purple-300">
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Host is generating questions...
                </span>
                <span className="text-xs opacity-70">Game will start automatically</span>
              </span>
            ) : (
              <span className="text-gray-600 dark:text-gray-400 animate-pulse">Waiting for host to start...</span>
            )}
          </div>
        )}

        {/* Solo Mode Hint */}
        {isSoloPlayer && (
          <p className="text-center text-xs text-gray-500 mt-4 max-w-sm">
            You can play solo to practice! Invite friends for multiplayer competition.
          </p>
        )}
      </div>

      {/* How to Play */}
      <div className="mt-6 p-4 bg-amber-100 dark:bg-[#231942]/50 rounded-xl border-2 border-amber-400 dark:border-purple-700/30 max-w-2xl mx-auto w-full">
        <h3 className="font-semibold mb-2 text-sm text-amber-700 dark:text-purple-300">⚡ How to Play</h3>
        <ul className="space-y-1 text-xs text-amber-800 dark:text-gray-400 tabular-nums">
          <li>• Answer trivia questions across <span className="inline-block w-5 text-center">{displaySettings.totalRounds}</span> rounds</li>
          <li>• Each round: <span className="inline-block w-5 text-center">{displaySettings.timeBetweenQuestions}</span>s to read → <span className="inline-block w-5 text-center">{displaySettings.timeToAnswer}</span>s to answer → <span className="inline-block w-5 text-center">{displaySettings.timeToViewAnswer}</span>s to view results</li>
          <li>• Bet tokens (1-10) based on your confidence</li>
          <li>• Correct = keep your token points • Wrong = lose that token forever</li>
          <li>• ⚠️ If you don't vote in time, your lowest token will be auto-bet on a random answer!</li>
          <li>• Highest score wins!</li>
        </ul>
      </div>
    </div>
  );
}
