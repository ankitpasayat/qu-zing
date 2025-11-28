import { useEffect, useState } from 'react';
import type { GameSession, Player } from '../types/game';
import { getDisplayName, getAvailableTokens } from '../types/game';
import { PlayerAvatar } from './PlayerAvatar';
import { GameControls } from './GameControls';
import { Confetti } from './Confetti';
import { useSoundEffects } from '../hooks/useSoundEffects';

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
  const { playSound } = useSoundEffects();
  const isBrowserMode = session.platform === 'browser';
  const [codeCopied, setCodeCopied] = useState(false);
  
  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(session.channelId);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };
  
  // Sort by score descending
  const rankedPlayers = [...players]
    .filter(p => !p.isSpectator)
    .sort((a, b) => b.score - a.score);
  
  const winner = rankedPlayers[0];
  const currentPlayerRank = rankedPlayers.findIndex(p => p.id === currentPlayer.id) + 1;
  const isSoloGame = rankedPlayers.length === 1;
  const isWinner = currentPlayer.id === winner?.id;

  // Play win sound on mount if player won or did well in solo
  useEffect(() => {
    if (isWinner || (isSoloGame && currentPlayer.score > 0)) {
      playSound('win');
      // Victory celebration sounds
      setTimeout(() => playSound('giggle'), 300);
      setTimeout(() => playSound('honk'), 600);
    }
  }, [isWinner, isSoloGame, currentPlayer.score, playSound]);

  return (
    <div className="min-h-screen flex flex-col p-4 pt-16 pb-24 safe-area-inset bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-100 dark:from-[#0c0618] dark:via-[#150d28] dark:to-[#1e1038] text-gray-900 dark:text-white transition-colors duration-300">
      {/* Confetti for winner */}
      <Confetti active={isWinner || (isSoloGame && currentPlayer.score > 0)} />
      
      <GameControls 
        lobbyCode={isBrowserMode ? session.channelId : undefined}
        onCopyCode={handleCopyCode}
        codeCopied={codeCopied}
      />
      
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-block relative">
          <h1 className="text-4xl font-black mb-2 animate-pop-in bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 dark:from-yellow-300 dark:via-pink-400 dark:to-purple-400 bg-clip-text text-transparent">
            🎉 Game Over! 🎊
          </h1>
          <div className="absolute -top-2 -right-4 text-2xl animate-wiggle">🌟</div>
          <div className="absolute -top-2 -left-4 text-2xl animate-wobble">✨</div>
        </div>
        {isSoloGame ? (
          <p className="text-gray-600 dark:text-gray-400 text-lg">Great solo practice! 💪</p>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            You placed <span className="text-yellow-600 dark:text-yellow-400 font-black text-xl animate-jelly inline-block">#{currentPlayerRank}</span> of {rankedPlayers.length} 🏆
          </p>
        )}
      </div>

      {/* Winner Podium (only if multiplayer) */}
      {!isSoloGame && winner && (
        <div className="flex flex-col items-center mb-6">
          <div className="game-card bg-gradient-to-r from-yellow-200/80 via-yellow-300/80 to-orange-200/80 dark:from-yellow-500/30 dark:via-yellow-400/40 dark:to-orange-500/30 border-4 border-yellow-400 dark:border-yellow-500/60 p-6 text-center animate-victory-dance relative overflow-visible">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-5xl animate-bounce-slow z-10">👑</div>
            <div className="absolute -top-2 -left-2 text-2xl animate-wiggle">🌟</div>
            <div className="absolute -top-2 -right-2 text-2xl animate-wobble">🌟</div>
            <div className="mt-4">
              <PlayerAvatar user={winner.discordUser} size={100} className="mx-auto mb-4 ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/30 animate-jelly" />
            </div>
            <h2 className="text-2xl font-black text-yellow-700 dark:text-yellow-300">{getDisplayName(winner.discordUser)}</h2>
            <p className="text-4xl font-black mt-3 bg-gradient-to-r from-orange-600 to-pink-600 dark:from-yellow-300 dark:to-orange-400 bg-clip-text text-transparent animate-score-pop">
              {winner.score} pts
            </p>
            <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400 mt-2 animate-bounce">🏆 CHAMPION! 🏆</p>
          </div>
        </div>
      )}

      {/* Solo Results */}
      {isSoloGame && (
        <div className="flex flex-col items-center mb-6">
          <div className="game-card bg-gradient-to-r from-purple-100/80 to-indigo-100/80 dark:from-purple-500/30 dark:to-indigo-500/30 border-3 border-purple-400 dark:border-purple-500/60 p-6 text-center animate-pop-in relative">
            <div className="absolute -top-2 -left-2 text-xl animate-wiggle">⭐</div>
            <div className="absolute -top-2 -right-2 text-xl animate-wobble">⭐</div>
            <PlayerAvatar user={currentPlayer.discordUser} size={100} className="mx-auto mb-4 ring-4 ring-purple-400 shadow-lg" />
            <h2 className="text-2xl font-black">{getDisplayName(currentPlayer.discordUser)}</h2>
            <p className="text-5xl font-black mt-3 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-300 dark:to-pink-400 bg-clip-text text-transparent animate-score-pop">
              {currentPlayer.score} pts
            </p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-3">
              {currentPlayer.score >= session.totalRounds * 3 
                ? '🔥 Amazing performance! 🔥' 
                : currentPlayer.score >= session.totalRounds 
                  ? '👏 Well done! 🎉' 
                  : '💪 Keep practicing! 🚀'}
            </p>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="flex-1 max-w-lg mx-auto w-full">
        <h3 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          {isSoloGame ? '📊 Your Stats' : '🏅 Final Standings'}
        </h3>
        
        <div className="space-y-3">
          {rankedPlayers.map((player, index) => {
            const isCurrentPlayer = player.id === currentPlayer.id;
            const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
            
            return (
              <div 
                key={player.id}
                className={`flex items-center gap-3 p-4 rounded-2xl transition-all animate-slide-in-up border-3
                  ${isCurrentPlayer 
                    ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-500/25 dark:to-pink-500/25 border-purple-400 dark:border-purple-500/60 shadow-lg' 
                    : 'game-card border-gray-300 dark:border-purple-700/40'
                  }
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-10 h-10 flex items-center justify-center font-black text-lg rounded-xl ${
                  medalEmoji 
                    ? 'text-2xl animate-bounce-happy' 
                    : 'bg-gray-200 dark:bg-purple-800/50 text-gray-600 dark:text-gray-300'
                }`}
                     style={medalEmoji ? { animationDelay: `${300 + index * 100}ms` } : {}}>
                  {medalEmoji || `${index + 1}`}
                </div>
                <PlayerAvatar user={player.discordUser} size={48} className={isCurrentPlayer ? 'ring-2 ring-purple-400' : ''} />
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate ${isCurrentPlayer ? 'text-purple-700 dark:text-purple-300' : ''}`}>
                    {getDisplayName(player.discordUser)}
                    {isCurrentPlayer && <span className="text-xs ml-2 px-2 py-0.5 bg-purple-200 dark:bg-purple-700/50 rounded-full">you</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    🎟️ {(() => {
                      const tokens = getAvailableTokens(player.tokenCounts);
                      return tokens.length > 0 ? tokens.join(', ') : 'none left';
                    })()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-300 dark:to-pink-400 bg-clip-text text-transparent">{player.score}</p>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spectators */}
      {session.spectators && session.spectators.length > 0 && (
        <div className="mt-4 max-w-lg mx-auto w-full">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            👀 <span className="font-medium">Spectators:</span> {session.spectators.map(s => getDisplayName(s.discordUser)).join(', ')}
          </p>
        </div>
      )}

      {/* Play Again */}
      <div className="mt-6 max-w-lg mx-auto w-full">
        {isHost ? (
          isStartingGame ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3 py-4 px-6 game-card border-3 border-purple-300 dark:border-purple-600/50 bg-purple-50 dark:bg-purple-900/30">
                <div className="animate-spin rounded-full h-6 w-6 border-4 border-purple-300 border-t-purple-600 dark:border-purple-600 dark:border-t-purple-300" />
                <span className="text-purple-700 dark:text-purple-300 font-bold">Generating questions...</span>
              </div>
              <button
                onClick={onCancelPlayAgain}
                className="w-full py-3 px-6 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-colors border-3 border-gray-300 dark:border-gray-600/50"
              >
                ✕ Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onPlayAgain}
              className="comic-button w-full py-4 px-6 rounded-2xl text-xl"
            >
              🔄 Play Again!
            </button>
          )
        ) : (
          <div className="text-center game-card p-4 border-3 border-gray-300 dark:border-purple-700/40">
            <p className="text-gray-600 dark:text-gray-400 font-medium flex items-center justify-center gap-2">
              <span className="animate-bounce">⏳</span>
              Waiting for host to start a new game...
            </p>
          </div>
        )}
        
        {/* Exit Game button */}
        {!isStartingGame && (
          <button
            onClick={onExitGame}
            className="w-full mt-3 py-3 px-6 bg-gray-100 dark:bg-purple-900/30 hover:bg-gray-200 dark:hover:bg-purple-800/50 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-colors border-3 border-gray-300 dark:border-purple-700/50 flex items-center justify-center gap-2"
          >
            🚪 Go to Lobby
          </button>
        )}
        
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4 font-medium">
          ✨ Invite more friends to join the next round! ✨
        </p>
      </div>
    </div>
  );
}
