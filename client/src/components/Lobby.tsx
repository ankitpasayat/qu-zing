import { useMemo, memo, useState } from 'react';
import type { GameSession, Player, GameSettings } from '../types/game';
import { getDisplayName } from '../types/game';
import { PlayerAvatar } from './PlayerAvatar';
import { ComicLogo } from './ComicLogo';
import { GameControls } from './GameControls';
import { TokenTrading } from './TokenTrading';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { copyToClipboard } from '../lib/platform';

// Memoized settings panel to prevent re-renders causing layout shifts
const SettingsPanel = memo(function SettingsPanel({
  settings,
  onUpdateSettings,
}: {
  settings: GameSettings;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
}) {
  return (
    <div className="w-full max-w-sm mb-6 goofy-panel" style={{ transform: 'rotate(-0.5deg)' }}>
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <span className="text-lg">⚙️</span> Game Settings
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rounds</label>
          <select 
            value={settings.totalRounds}
            onChange={(e) => onUpdateSettings({ totalRounds: parseInt(e.target.value) })}
            className="bg-white dark:bg-[#1e1038] border-2 border-gray-800 dark:border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-white shadow-[2px_2px_0_#2d1b4e] dark:shadow-[2px_2px_0_#f8f5ff]"
          >
            <option value={5}>5 rounds</option>
            <option value={10}>10 rounds</option>
            <option value={15}>15 rounds</option>
            <option value={20}>20 rounds</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time to read question</label>
          <select 
            value={settings.timeBetweenQuestions}
            onChange={(e) => onUpdateSettings({ timeBetweenQuestions: parseInt(e.target.value) })}
            className="bg-white dark:bg-[#1e1038] border-2 border-gray-800 dark:border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-white shadow-[2px_2px_0_#2d1b4e] dark:shadow-[2px_2px_0_#f8f5ff]"
          >
            <option value={3}>3 sec</option>
            <option value={5}>5 sec</option>
            <option value={7}>7 sec</option>
            <option value={10}>10 sec</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time to answer</label>
          <select 
            value={settings.timeToAnswer}
            onChange={(e) => onUpdateSettings({ timeToAnswer: parseInt(e.target.value) })}
            className="bg-white dark:bg-[#1e1038] border-2 border-gray-800 dark:border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-white shadow-[2px_2px_0_#2d1b4e] dark:shadow-[2px_2px_0_#f8f5ff]"
          >
            <option value={5}>5 sec</option>
            <option value={10}>10 sec</option>
            <option value={15}>15 sec</option>
            <option value={20}>20 sec</option>
            <option value={30}>30 sec</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time to view answer</label>
          <select 
            value={settings.timeToViewAnswer}
            onChange={(e) => onUpdateSettings({ timeToViewAnswer: parseInt(e.target.value) })}
            className="bg-white dark:bg-[#1e1038] border-2 border-gray-800 dark:border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-white shadow-[2px_2px_0_#2d1b4e] dark:shadow-[2px_2px_0_#f8f5ff]"
          >
            <option value={3}>3 sec</option>
            <option value={5}>5 sec</option>
            <option value={7}>7 sec</option>
            <option value={10}>10 sec</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mid-game joins</label>
          <button
            onClick={() => onUpdateSettings({ allowMidGameJoin: !settings.allowMidGameJoin })}
            className={`w-14 h-7 rounded-full transition-all border-2 border-gray-800 dark:border-gray-200 shadow-[2px_2px_0_#2d1b4e] dark:shadow-[2px_2px_0_#f8f5ff] ${
              settings.allowMidGameJoin ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white border-2 border-gray-800 dark:border-gray-200 shadow transform transition-transform ${
              settings.allowMidGameJoin ? 'translate-x-7' : 'translate-x-0.5'
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
  onTradeUp?: (sourceValue: number) => void;
  onTradeDown?: (sourceValue: number) => void;
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
  optimisticSettings,
  onTradeUp,
  onTradeDown
}: LobbyProps) {
  const { playSound } = useSoundEffects();
  const [codeCopied, setCodeCopied] = useState(false);
  const playerCount = session.players.length;
  const isSoloPlayer = playerCount === 1;
  const isBrowserMode = session.platform === 'browser';
  
  // Memoize display settings to prevent unnecessary re-renders
  // Cast to full GameSettings since we're merging with session.settings
  const displaySettings = useMemo(() => ({
    ...session.settings,
    ...optimisticSettings
  } as GameSettings), [session.settings, optimisticSettings]);

  const handleStartGame = () => {
    playSound('gameStart');
    // Add goofy fanfare
    setTimeout(() => playSound('slideWhistleUp'), 200);
    onStartGame();
  };

  const handleCopyCode = async () => {
    const success = await copyToClipboard(session.channelId);
    if (success) {
      setCodeCopied(true);
      playSound('ding');
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // Random slight rotations for goofy feel
  const rotations = [-2, 1, -1, 2, -1.5, 1.5, -0.5, 0.5];

  return (
    <div className="min-h-screen flex flex-col p-4 pt-16 safe-area-inset bg-gradient-to-br from-orange-50 via-pink-50 to-purple-100 dark:from-[#0c0618] dark:via-[#150d28] dark:to-[#1e1038] text-gray-900 dark:text-white transition-colors duration-300">
      {/* Game Controls - unified top bar */}
      <GameControls 
        showExitButton={isBrowserMode}
        onExit={onExitGame}
        lobbyCode={isBrowserMode ? session.channelId : undefined}
        onCopyCode={handleCopyCode}
        codeCopied={codeCopied}
      />

      {/* Header */}
      <div className="text-center py-4">
        <ComicLogo size="md" />
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 font-medium">Test what you know. Win with confidence!</p>
      </div>

      {/* Players Grid */}
      <div className="flex-1 flex flex-col items-center justify-start pt-4 max-w-2xl mx-auto w-full">
        {/* Lobby Code (Browser mode only) - now displayed in top bar, show invite section here */}
        {isBrowserMode && (
          <div className="w-full mb-6 text-center">
            <button
              onClick={onInviteFriends}
              className="comic-button-secondary px-6 py-3 rounded-xl inline-flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
              style={{ transform: 'rotate(-1deg)' }}
            >
              <span className="text-xl">📤</span>
              <span className="font-bold">Share Invite Link</span>
            </button>
          </div>
        )}
        
        {/* Current Players */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
              <span className="text-lg">👥</span> Players ({playerCount})
            </span>
            {isSoloPlayer && (
              <span className="text-xs font-bold text-amber-600 dark:text-yellow-400 animate-pulse px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                🎮 Solo mode!
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {session.players.map((player, index) => (
              <div 
                key={player.id}
                className={`relative flex items-center gap-3 p-3 rounded-xl transition-all animate-pop-in goofy-panel
                  ${player.id === currentPlayer.id 
                    ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30' 
                    : 'bg-white dark:bg-[#1e1038]'
                  }
                  ${!player.isConnected ? 'opacity-50' : ''}
                `}
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  transform: `rotate(${rotations[index % rotations.length]}deg)`
                }}
              >
                <PlayerAvatar user={player.discordUser} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate text-sm">
                    {getDisplayName(player.discordUser)}
                  </p>
                  {player.isHost && (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <span>👑</span> Host
                    </span>
                  )}
                </div>
                <div className={`w-3 h-3 rounded-full border-2 border-gray-800 dark:border-white ${player.isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Invite Friends Button (Discord only) */}
        {!isBrowserMode && (
          <button
            onClick={onInviteFriends}
            className="w-full max-w-sm mb-6 py-4 px-6 comic-button-secondary rounded-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            style={{ transform: 'rotate(0.5deg)' }}
          >
            <span className="text-2xl animate-wiggle">👋</span>
            <span className="font-bold">Invite Friends</span>
          </button>
        )}

        {/* Settings (Host only) - using memoized component */}
        {isHost && (
          <SettingsPanel 
            settings={displaySettings} 
            onUpdateSettings={onUpdateSettings} 
          />
        )}

        {/* Token Trading - available to all players in lobby */}
        {onTradeUp && onTradeDown && (
          <div className="w-full max-w-sm mb-4">
            <TokenTrading
              tokenCounts={currentPlayer.tokenCounts}
              onTradeUp={onTradeUp}
              onTradeDown={onTradeDown}
              disabled={isStartingGame || session.isGeneratingQuestions}
            />
          </div>
        )}

        {/* Start/Waiting */}
        {isHost ? (
          <div className="w-full max-w-sm">
            <button
              onClick={handleStartGame}
              disabled={isStartingGame || session.isGeneratingQuestions}
              className="comic-button w-full py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-lg"
              style={{ transform: 'rotate(-1deg)' }}
            >
              {(isStartingGame || session.isGeneratingQuestions) ? (
                <span className="flex flex-col items-center justify-center gap-1">
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </span>
                  <span className="text-xs opacity-70 normal-case">This may take a few seconds</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="text-2xl">{isSoloPlayer ? '🎮' : '🚀'}</span>
                  {isSoloPlayer ? 'Start Solo!' : 'Start Game!'}
                </span>
              )}
            </button>
            {session.isGeneratingQuestions && onCancelGeneration && (
              <button
                onClick={onCancelGeneration}
                className="w-full mt-2 py-2 px-4 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/40 text-red-600 dark:text-red-400 border-2 border-red-400 dark:border-red-600 rounded-xl font-bold transition-colors shadow-[2px_2px_0_#dc2626]"
              >
                ✕ Cancel
              </button>
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm text-center py-4 px-6 goofy-panel" style={{ transform: 'rotate(0.5deg)' }}>
            {session.isGeneratingQuestions ? (
              <span className="flex flex-col items-center gap-2 text-purple-600 dark:text-purple-300">
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="font-bold">Host is generating questions...</span>
                </span>
                <span className="text-xs opacity-70">Game will start automatically</span>
              </span>
            ) : (
              <span className="text-gray-600 dark:text-gray-400 animate-pulse font-medium">⏳ Waiting for host to start...</span>
            )}
          </div>
        )}

        {/* Solo Mode Hint */}
        {isSoloPlayer && (
          <p className="text-center text-xs text-gray-500 mt-4 max-w-sm font-medium">
            🎯 You can play solo to practice! Invite friends for multiplayer fun.
          </p>
        )}
      </div>

      {/* How to Play - Goofy styled */}
      <div className="mt-6 goofy-panel max-w-2xl mx-auto w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20" style={{ transform: 'rotate(-0.3deg)' }}>
        <h3 className="font-bold mb-2 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <span className="text-lg">⚡</span> How to Play
        </h3>
        <ul className="space-y-1 text-xs text-amber-800 dark:text-gray-400 tabular-nums font-medium">
          <li>• Answer trivia questions across <span className="inline-block w-5 text-center font-bold">{displaySettings.totalRounds}</span> rounds</li>
          <li>• Each round: <span className="inline-block w-5 text-center font-bold">{displaySettings.timeBetweenQuestions}</span>s to read → <span className="inline-block w-5 text-center font-bold">{displaySettings.timeToAnswer}</span>s to answer → <span className="inline-block w-5 text-center font-bold">{displaySettings.timeToViewAnswer}</span>s to view results</li>
          <li>• Bet tokens (1-10) based on your confidence</li>
          <li>• Correct = keep your token points • Wrong = lose that token forever</li>
          <li>• ⚠️ If you don't vote in time, your lowest token will be auto-bet on a random answer!</li>
        </ul>
        <h4 className="font-bold mt-3 mb-1 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <span className="text-sm">🎮</span> Power-ups & Bonuses
        </h4>
        <ul className="space-y-1 text-xs text-amber-800 dark:text-gray-400 font-medium">
          <li>• <strong className="text-purple-600 dark:text-purple-400">⚡ Double Down:</strong> 2x points if correct, high risk!</li>
          <li>• <strong className="text-blue-600 dark:text-blue-400">🛡️ Safety Net:</strong> Get your token back if wrong</li>
          <li>• <strong className="text-pink-600 dark:text-pink-400">✂️ 50/50:</strong> Removes 2 incorrect answers</li>
          <li>• <strong className="text-orange-600 dark:text-orange-400">🔥 Streak Fire:</strong> 2+ correct in a row = bonus points</li>
          <li>• <strong className="text-cyan-600 dark:text-cyan-400">⚡ Speed Demon:</strong> Answer in first 3s = +2 bonus</li>
          <li>• <strong className="text-amber-600 dark:text-amber-400">🎲 Endgame Gambit:</strong> Round 8 — answer 3 in a row for 2x your highest token!</li>
        </ul>
        <p className="mt-2 text-xs text-amber-700 dark:text-purple-400 font-bold">🏆 Highest score wins!</p>
      </div>
    </div>
  );
}
