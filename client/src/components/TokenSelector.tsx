interface TokenSelectorProps {
  availableTokens: number[];
  selectedToken: number | null;
  onSelect: (token: number) => void;
  disabled?: boolean;
}

export function TokenSelector({ availableTokens, selectedToken, onSelect, disabled = false }: TokenSelectorProps) {
  if (availableTokens.length === 0) {
    return (
      <div className="mt-6 p-4 bg-amber-100 dark:bg-amber-500/20 border border-amber-400 dark:border-amber-500/50 rounded-xl text-center">
        <p className="text-amber-700 dark:text-amber-300">No tokens remaining!</p>
        <p className="text-sm text-amber-600 dark:text-amber-400/70 mt-1">You'll still earn points, just at 1x</p>
      </div>
    );
  }

  const getTokenColors = (val: number): [string, string] => {
    switch(val) {
      case 1: return ['#dc2626', '#991b1b'];
      case 2: return ['#ea580c', '#9a3412'];
      case 3: return ['#f59e0b', '#b45309'];
      case 4: return ['#eab308', '#a16207'];
      case 5: return ['#84cc16', '#4d7c0f'];
      case 6: return ['#10b981', '#047857'];
      case 7: return ['#06b6d4', '#0e7490'];
      case 8: return ['#3b82f6', '#1d4ed8'];
      case 9: return ['#a855f7', '#7e22ce'];
      case 10: return ['#ec4899', '#be185d'];
      default: return ['#6b7280', '#374151'];
    }
  };

  // Parse hex colors to RGB for effects
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };

  return (
    <div className="mt-6">
      <p className={`text-sm mb-3 transition-colors ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>
        {disabled ? 'Select an answer first to bet a token' : 'How confident are you? Bet a token:'}
      </p>
      <div className="grid grid-cols-5 gap-2 md:gap-4 max-w-md md:max-w-2xl mx-auto transition-all duration-300">
        {availableTokens.sort((a, b) => a - b).map((token) => {
          const [color1, color2] = getTokenColors(token);
          const rgb = hexToRgb(color1);
          
          // Create muted versions for disabled state
          const disabledColor1 = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
          const disabledColor2 = `rgba(${Math.max(0, rgb.r - 40)}, ${Math.max(0, rgb.g - 40)}, ${Math.max(0, rgb.b - 40)}, 0.25)`;
          
          return (
            <button
              key={token}
              onClick={() => !disabled && onSelect(token)}
              disabled={disabled}
              aria-disabled={disabled}
              title={disabled ? 'Select an answer first' : `Bet ${token} point${token > 1 ? 's' : ''}`}
              className={`w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full font-bold text-lg md:text-xl lg:text-2xl relative border-4 md:border-[6px] transition-all duration-200
                ${disabled 
                  ? 'cursor-not-allowed border-gray-300/50 dark:border-gray-600/40 text-gray-400 dark:text-gray-500 scale-95' 
                  : selectedToken === token 
                    ? 'scale-110 border-white text-white shadow-lg' 
                    : 'border-white/90 hover:scale-105 hover:border-white text-white shadow-lg'
                }`}
              style={{
                boxShadow: disabled
                  ? 'inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.1)'
                  : selectedToken === token 
                    ? `0 0 25px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8), 0 0 40px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5), inset 0 3px 8px rgba(255, 255, 255, 0.4), inset 0 -3px 8px rgba(0, 0, 0, 0.3)` 
                    : 'inset 0 3px 6px rgba(255, 255, 255, 0.3), inset 0 -3px 6px rgba(0, 0, 0, 0.4), 0 6px 12px rgba(0, 0, 0, 0.6)',
                background: disabled
                  ? `linear-gradient(135deg, ${disabledColor1}, ${disabledColor2})`
                  : selectedToken === token 
                    ? `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4), transparent 50%), linear-gradient(135deg, ${color1}, ${color2})`
                    : `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), transparent 50%), linear-gradient(135deg, ${color1}, ${color2})`
              }}
            >
              <span className={`relative z-10 ${disabled ? 'drop-shadow-none' : 'drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]'}`}>{token}</span>
              {/* Edge notches to simulate poker chip texture */}
              <div className="absolute inset-0 rounded-full transition-opacity duration-200" style={{
                background: `repeating-conic-gradient(from 0deg, transparent 0deg 8deg, rgba(255, 255, 255, ${disabled ? '0.05' : '0.15'}) 8deg 10deg)`,
                opacity: disabled ? 0.5 : 1
              }}></div>
              {/* Center ring detail */}
              <div className={`absolute inset-[30%] rounded-full border-2 transition-colors duration-200 ${disabled ? 'border-gray-400/10 dark:border-gray-500/10' : 'border-white/20'}`}></div>
            </button>
          );
        })}
      </div>
      {selectedToken && (
        <p className="text-center mt-3 text-sm text-yellow-600 dark:text-yellow-300">
          Correct = +{selectedToken} points • Wrong = lose token
        </p>
      )}
    </div>
  );
}
