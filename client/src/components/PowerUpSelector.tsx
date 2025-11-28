import type { PowerUp, PowerUpType, Question } from '../types/game';

interface PowerUpSelectorProps {
  powerUps: PowerUp[];
  selectedPowerUp: PowerUpType | null;
  onSelect: (powerUp: PowerUpType | null) => void;
  question: Question;
  disabled?: boolean;
  eliminatedOptions?: number[] | null;
  onRequest5050?: () => void;
}

// Custom SVG icons for power-ups - more engaging than emoji
function DoubleDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="url(#doubledown-grad)" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 6L12 18M8 14L12 18L16 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 10L12 14L16 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="doubledown-grad" x1="2" y1="2" x2="22" y2="22">
          <stop stopColor="#fbbf24"/>
          <stop offset="1" stopColor="#f59e0b"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function SafetyNetIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L4 7V11C4 15.4183 7.58172 20 12 21C16.4183 20 20 15.4183 20 11V7L12 3Z" fill="url(#shield-grad)" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="shield-grad" x1="4" y1="3" x2="20" y2="21">
          <stop stopColor="#60a5fa"/>
          <stop offset="1" stopColor="#3b82f6"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function FiftyFiftyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="url(#5050-grad)" stroke="currentColor" strokeWidth="2"/>
      <path d="M6 12H18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <text x="12" y="9" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">50</text>
      <text x="12" y="17" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">50</text>
      <defs>
        <linearGradient id="5050-grad" x1="2" y1="2" x2="22" y2="22">
          <stop stopColor="#f472b6"/>
          <stop offset="1" stopColor="#ec4899"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function PowerUpSelector({
  powerUps,
  selectedPowerUp,
  onSelect,
  question,
  disabled = false,
  eliminatedOptions,
  onRequest5050,
}: PowerUpSelectorProps) {
  const availablePowerUps = powerUps.filter(p => !p.used);
  
  if (availablePowerUps.length === 0) {
    return null;
  }

  const getPowerUpInfo = (type: PowerUpType): { 
    icon: React.ReactNode; 
    name: string; 
    description: string;
    bgColor: string;
    borderColor: string;
  } => {
    switch (type) {
      case 'double-down':
        return {
          icon: <DoubleDownIcon className="w-7 h-7" />,
          name: '2X',
          description: 'Double points if correct!',
          bgColor: 'from-amber-400 to-orange-500',
          borderColor: 'border-amber-500',
        };
      case 'safety-net':
        return {
          icon: <SafetyNetIcon className="w-7 h-7" />,
          name: 'Shield',
          description: 'Keep your token if wrong',
          bgColor: 'from-blue-400 to-blue-600',
          borderColor: 'border-blue-500',
        };
      case '50-50':
        return {
          icon: <FiftyFiftyIcon className="w-7 h-7" />,
          name: '50/50',
          description: 'Remove 2 wrong answers',
          bgColor: 'from-pink-400 to-pink-600',
          borderColor: 'border-pink-500',
        };
    }
  };

  const canUse5050 = question.type === 'multiple-choice' && !eliminatedOptions;

  const handlePowerUpClick = (type: PowerUpType) => {
    if (disabled) return;
    
    if (type === '50-50') {
      if (!canUse5050) return;
      // Request 50/50 options from server
      if (onRequest5050) {
        onRequest5050();
      }
    }
    
    // Toggle selection
    if (selectedPowerUp === type) {
      onSelect(null);
    } else {
      onSelect(type);
    }
  };

  return (
    <div className="mt-4 mb-2">
      <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 text-center flex items-center justify-center gap-2">
        <span className="text-lg">✨</span> Power-ups <span className="text-xs font-normal opacity-70">(optional)</span>
      </p>
      <div className="flex justify-center gap-3 flex-wrap">
        {availablePowerUps.map((powerUp, idx) => {
          const info = getPowerUpInfo(powerUp.type);
          const isSelected = selectedPowerUp === powerUp.type;
          const is5050Disabled = powerUp.type === '50-50' && !canUse5050;
          const isDisabled = disabled || is5050Disabled;
          const rotations = [-2, 1, -1.5];

          return (
            <button
              key={powerUp.type}
              onClick={() => handlePowerUpClick(powerUp.type)}
              disabled={isDisabled}
              title={is5050Disabled ? 'Only works on multiple choice' : info.description}
              className={`
                power-up-btn flex flex-col items-center gap-1 px-4 py-3 min-w-[80px]
                ${isDisabled
                  ? 'opacity-40 cursor-not-allowed !transform-none'
                  : isSelected
                    ? `bg-gradient-to-br ${info.bgColor} ${info.borderColor} animate-pulse-glow`
                    : ''
                }
              `}
              style={{ transform: !isDisabled ? `rotate(${rotations[idx]}deg)` : undefined }}
            >
              {info.icon}
              <span className={`text-xs font-bold ${isSelected ? 'text-white' : ''}`}>{info.name}</span>
            </button>
          );
        })}
      </div>
      {selectedPowerUp && (
        <p className="text-center mt-3 text-sm font-bold text-amber-600 dark:text-amber-400 animate-pop-in">
          ✨ {getPowerUpInfo(selectedPowerUp).description}
        </p>
      )}
      {eliminatedOptions && eliminatedOptions.length > 0 && (
        <p className="text-center mt-3 text-sm font-bold text-green-600 dark:text-green-400 animate-pop-in flex items-center justify-center gap-2">
          <span className="text-lg">✂️</span> 50/50 active! 2 wrong answers removed.
        </p>
      )}
    </div>
  );
}
