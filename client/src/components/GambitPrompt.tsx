import type { Player } from '../types/game';
import { getHighestAvailableToken, getGambitReward, canActivateGambit } from '../types/game';

interface GambitPromptProps {
  player: Player;
  currentRound: number;
  totalRounds: number;
  onActivate: () => void;
  onDismiss: () => void;
}

export function GambitPrompt({ 
  player, 
  currentRound, 
  totalRounds, 
  onActivate, 
  onDismiss 
}: GambitPromptProps) {
  // Only show at 3rd-to-last round
  if (!canActivateGambit(currentRound, totalRounds)) {
    return null;
  }

  // Don't show if already has an active gambit
  if (player.gambit?.isActive) {
    return null;
  }

  const stakeToken = getHighestAvailableToken(player.tokenCounts);
  const potentialReward = getGambitReward(stakeToken);

  if (stakeToken === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="game-card bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6 max-w-md w-full border-4 border-purple-400/60 shadow-2xl shadow-purple-500/40 animate-pop-in relative overflow-hidden">
        {/* Decorative sparkles */}
        <div className="absolute top-4 left-4 text-2xl animate-wiggle">✨</div>
        <div className="absolute top-6 right-6 text-xl animate-wobble">🌟</div>
        <div className="absolute bottom-20 left-6 text-lg animate-float">💎</div>
        <div className="absolute bottom-24 right-8 text-xl animate-wiggle" style={{ animationDelay: '0.3s' }}>⭐</div>
        
        {/* Header */}
        <div className="text-center mb-6 relative">
          <div className="relative inline-block">
            <span className="text-6xl mb-3 block animate-bounce-slow">🎲</span>
            <div className="absolute -top-1 -right-3 text-2xl animate-wiggle">🔥</div>
          </div>
          <h2 className="text-3xl font-black text-white mb-2 bg-gradient-to-r from-yellow-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
            The Trifecta!
          </h2>
          <p className="text-purple-300 text-base font-bold flex items-center justify-center gap-2">
            <span className="text-lg">🎰</span>
            Endgame Gambit Available!
            <span className="text-lg">🎰</span>
          </p>
        </div>

        {/* Stakes explanation */}
        <div className="game-card bg-black/40 p-5 mb-6 space-y-4 border-3 border-purple-500/40">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-bold flex items-center gap-2">
              <span className="text-lg">🎟️</span> Your Stake:
            </span>
            <span className="font-black text-yellow-400 text-xl animate-jelly">{stakeToken} Token</span>
          </div>
          
          <div className="border-t-2 border-purple-500/30 pt-4">
            <p className="text-sm text-gray-400 mb-2 font-bold flex items-center gap-2">
              <span className="text-base">🎯</span> Win Condition:
            </p>
            <p className="text-white font-bold text-lg">
              Answer the next <span className="text-green-400 font-black">3 questions</span> correctly! 🔥
            </p>
          </div>

          <div className="border-t-2 border-purple-500/30 pt-4 space-y-2">
            <div className="flex items-center justify-between bg-green-500/10 p-2 rounded-lg border border-green-500/30">
              <span className="text-gray-300 font-bold flex items-center gap-2">
                <span>✅</span> If you win:
              </span>
              <span className="text-green-400 font-black text-lg">+{potentialReward} bonus points! 🏆</span>
            </div>
            <div className="flex items-center justify-between bg-red-500/10 p-2 rounded-lg border border-red-500/30">
              <span className="text-gray-300 font-bold flex items-center gap-2">
                <span>❌</span> If you fail:
              </span>
              <span className="text-red-400 font-black text-lg">-{stakeToken} points penalty 💔</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-4 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded-2xl transition-all border-3 border-gray-600 hover:border-gray-500 active:scale-95"
          >
            😅 Not this time
          </button>
          <button
            onClick={onActivate}
            className="flex-1 py-4 px-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-400 hover:via-pink-400 hover:to-orange-400 text-white font-black rounded-2xl transition-all shadow-lg hover:shadow-purple-500/40 border-3 border-purple-300/50 hover:scale-105 active:scale-95 animate-pulse-glow"
          >
            🎲 Activate Gambit!
          </button>
        </div>

        <p className="text-center text-sm text-purple-400/80 mt-4 font-medium flex items-center justify-center gap-2">
          <span>⚠️</span>
          This is a one-time offer for this game!
        </p>
      </div>
    </div>
  );
}

// Status display for active gambit
export function GambitStatus({ gambit }: { gambit: Player['gambit'] }) {
  if (!gambit || !gambit.isActive) {
    return null;
  }

  if (gambit.completed) {
    return (
      <div className={`
        inline-flex items-center gap-3 px-5 py-3 rounded-2xl font-black text-lg animate-pop-in
        ${gambit.won 
          ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-300 border-3 border-green-400/60 shadow-lg shadow-green-500/20' 
          : 'bg-gradient-to-r from-red-500/30 to-rose-500/30 text-red-300 border-3 border-red-400/60 shadow-lg shadow-red-500/20'
        }
      `}>
        <span className="text-2xl animate-bounce">{gambit.won ? '🏆' : '💔'}</span>
        <span>{gambit.won ? 'Gambit Won!' : 'Gambit Failed'}</span>
        <span className={`text-base px-2 py-1 rounded-lg ${gambit.won ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
          {gambit.won ? '+' : '-'}{gambit.won ? gambit.stakeTokenValue * 2 : gambit.stakeTokenValue}
        </span>
      </div>
    );
  }

  // Active gambit progress
  const remaining = 3 - gambit.consecutiveCorrect;
  
  return (
    <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 border-3 border-purple-400/60 shadow-lg shadow-purple-500/20 animate-pulse-glow">
      <span className="text-2xl animate-wiggle">🎲</span>
      <div className="flex items-center gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full transition-all duration-300 border-2 ${
              i < gambit.consecutiveCorrect 
                ? 'bg-green-400 border-green-300 scale-110 animate-pop-in shadow-lg shadow-green-400/50' 
                : 'bg-gray-700 border-gray-600'
            }`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {i < gambit.consecutiveCorrect && (
              <span className="flex items-center justify-center text-xs text-green-900 font-black">✓</span>
            )}
          </div>
        ))}
      </div>
      <span className="text-purple-200 font-black text-base">
        {remaining} to go! 🔥
      </span>
    </div>
  );
}
