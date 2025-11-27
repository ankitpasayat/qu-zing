import type { GameSession, Player } from '../types/game';
import { getDisplayName, getAvailableTokens } from '../types/game';
import { PlayerAvatar } from './PlayerAvatar';
import { ThemeToggle } from './ThemeToggle';
import { LobbyCodeDisplay } from './BrowserLobby';

interface ResultsProps {
  session: GameSession;
  currentPlayer: Player;
  isHost: boolean;
  onPlayAgain: () => void;
  onCancelPlayAgain?: () => void;
  isStartingGame?: boolean;
  onExitGame?: () => void;
}

export function Results({ session, currentPlayer, isHost, onPlayAgain, onCancelPlayAgain, isStartingGame, onExitGame }: ResultsProps) {
  const { players } = session;
  const isBrowserMode = session.platform === 'browser';
  
  // Sort by score descending
  const rankedPlayers = [...players]
    .filter(p => !p.isSpectator)
    .sort((a, b) => b.score - a.score);
  
  const winner = rankedPlayers[0];
  const currentPlayerRank = rankedPlayers.findIndex(p => p.id === currentPlayer.id) + 1;
  const isSoloGame = rankedPlayers.length === 1;

  return (
    <div className="min-h-screen flex flex-col p-4 safe-area-inset bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] text-gray-900 dark:text-white transition-colors duration-300">
      <ThemeToggle />
      {/* Lobby code badge for browser mode */}
      {isBrowserMode && (
        <div className="absolute top-4 right-16 z-10">
          <LobbyCodeDisplay lobbyCode={session.channelId} compact />
        </div>
      )}
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🎉 Game Over!</h1>
        {isSoloGame ? (
          <p className="text-gray-600 dark:text-gray-400">Great solo practice session!</p>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">
            You placed <span className="text-yellow-500 dark:text-yellow-400 font-semibold">#{currentPlayerRank}</span> of {rankedPlayers.length}
          </p>
        )}
      </div>

      {/* Winner Podium (only if multiplayer) */}
      {!isSoloGame && winner && (
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-r from-yellow-200/50 via-yellow-300/50 to-yellow-200/50 dark:from-yellow-500/20 dark:via-yellow-400/30 dark:to-yellow-500/20 border-2 border-yellow-400 dark:border-yellow-500/50 rounded-2xl p-6 text-center animate-pulse-slow">
            <span className="text-4xl mb-2 block">👑</span>
            <PlayerAvatar user={winner.discordUser} size={80} className="mx-auto mb-3 ring-4 ring-yellow-400" />
            <h2 className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{getDisplayName(winner.discordUser)}</h2>
            <p className="text-3xl font-bold mt-2">{winner.score} pts</p>
          </div>
        </div>
      )}

      {/* Solo Results */}
      {isSoloGame && (
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-r from-purple-100/50 to-indigo-100/50 dark:from-purple-500/20 dark:to-indigo-500/20 border-2 border-purple-400 dark:border-purple-500/50 rounded-2xl p-6 text-center">
            <PlayerAvatar user={currentPlayer.discordUser} size={80} className="mx-auto mb-3" />
            <h2 className="text-xl font-bold">{getDisplayName(currentPlayer.discordUser)}</h2>
            <p className="text-4xl font-bold mt-2">{currentPlayer.score} pts</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {currentPlayer.score >= session.totalRounds * 3 
                ? '🔥 Amazing performance!' 
                : currentPlayer.score >= session.totalRounds 
                  ? '👏 Well done!' 
                  : '💪 Keep practicing!'}
            </p>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="flex-1 max-w-lg mx-auto w-full">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          {isSoloGame ? 'Your Stats' : 'Final Standings'}
        </h3>
        
        <div className="space-y-2">
          {rankedPlayers.map((player, index) => {
            const isCurrentPlayer = player.id === currentPlayer.id;
            const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
            
            return (
              <div 
                key={player.id}
                className={`flex items-center gap-3 p-4 rounded-xl transition-all
                  ${isCurrentPlayer 
                    ? 'bg-purple-100 dark:bg-purple-500/20 border-2 border-purple-400 dark:border-purple-500/50' 
                    : 'bg-white/70 dark:bg-[#231942]/50 border border-purple-200/50 dark:border-purple-700/30'
                  }
                `}
              >
                <div className="w-8 text-center font-bold text-lg">
                  {medalEmoji || `#${index + 1}`}
                </div>
                <PlayerAvatar user={player.discordUser} size={40} />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isCurrentPlayer ? 'text-purple-700 dark:text-purple-300' : ''}`}>
                    {getDisplayName(player.discordUser)}
                    {isCurrentPlayer && <span className="text-xs ml-2 opacity-60">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tokens: {(() => {
                      const tokens = getAvailableTokens(player.tokenCounts);
                      return tokens.length > 0 ? tokens.join(', ') : 'none left';
                    })()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{player.score}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spectators */}
      {session.spectators && session.spectators.length > 0 && (
        <div className="mt-6 max-w-lg mx-auto w-full">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Spectators: {session.spectators.map(s => getDisplayName(s.discordUser)).join(', ')}
          </p>
        </div>
      )}

      {/* Play Again */}
      <div className="mt-8 max-w-lg mx-auto w-full">
        {isHost ? (
          isStartingGame ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 py-4 px-6 bg-purple-100 dark:bg-purple-900/30 rounded-xl border border-purple-300 dark:border-purple-700/50">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 dark:border-purple-400" />
                <span className="text-purple-700 dark:text-purple-300 font-medium">Generating questions...</span>
              </div>
              <button
                onClick={onCancelPlayAgain}
                className="w-full py-3 px-6 bg-gray-200 dark:bg-gray-800/50 hover:bg-gray-300 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors border border-gray-300 dark:border-gray-600/50"
              >
                ✕ Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onPlayAgain}
              className="comic-button w-full py-4 px-6 rounded-xl"
            >
              🔄 Play Again
            </button>
          )
        ) : (
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>Waiting for host to start a new game...</p>
          </div>
        )}
        
        {/* Exit Game button */}
        {!isStartingGame && (
          <button
            onClick={onExitGame}
            className="w-full mt-4 py-3 px-6 bg-gray-200 dark:bg-purple-900/30 hover:bg-gray-300 dark:hover:bg-purple-800/50 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors border border-gray-300 dark:border-purple-700/50"
          >
            🚪 Go to Lobby
          </button>
        )}
        
        <p className="text-center text-sm text-gray-500 mt-4">
          Invite more friends to join the next round!
        </p>
      </div>
    </div>
  );
}
