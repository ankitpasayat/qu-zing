import type { StreakState, GambitState } from '../types/game';
import { getStreakBonus } from '../types/game';

interface StreakIndicatorProps {
  streak: StreakState;
  gambit: GambitState | null;
  showBonus?: boolean;
}

export function StreakIndicator({ streak, gambit, showBonus = true }: StreakIndicatorProps) {
  if (streak.current < 2 && !gambit?.isActive) {
    return null;
  }

  const isGambitActive = gambit?.isActive && !gambit?.completed;
  const streakBonus = getStreakBonus(streak.current);

  // Fire color based on gambit status
  const fireColor = isGambitActive 
    ? 'from-blue-400 via-cyan-400 to-blue-500' // Blue plasma for gambit
    : 'from-orange-400 via-red-500 to-yellow-400'; // Normal fire

  const fireGlow = isGambitActive
    ? 'shadow-[0_0_20px_rgba(59,130,246,0.5)]'
    : 'shadow-[0_0_20px_rgba(249,115,22,0.5)]';

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${fireColor} ${fireGlow} animate-pulse`}>
      {/* Fire emoji with animation */}
      <span className="text-2xl animate-bounce" style={{ animationDuration: '0.5s' }}>
        {isGambitActive ? '💠' : '🔥'}
      </span>
      
      {/* Streak count */}
      <span className="font-bold text-white text-lg">
        {streak.current} Streak!
      </span>

      {/* Bonus indicator */}
      {showBonus && streakBonus > 0 && (
        <span className="text-sm font-medium text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
          +{streakBonus}
        </span>
      )}

      {/* Gambit indicator */}
      {isGambitActive && gambit && (
        <span className="text-sm font-bold text-white bg-blue-600/50 px-2 py-0.5 rounded-full">
          GAMBIT {gambit.consecutiveCorrect}/3
        </span>
      )}
    </div>
  );
}

// Compact version for use in player cards
export function StreakBadge({ streak, gambit }: { streak: StreakState; gambit: GambitState | null }) {
  if (streak.current < 2 && !gambit?.isActive) {
    return null;
  }

  const isGambitActive = gambit?.isActive && !gambit?.completed;

  return (
    <span 
      className={`
        inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full
        ${isGambitActive 
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
          : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
        }
      `}
      title={`${streak.current} correct in a row${isGambitActive ? ' (Gambit active!)' : ''}`}
    >
      {isGambitActive ? '💠' : '🔥'} {streak.current}
    </span>
  );
}
