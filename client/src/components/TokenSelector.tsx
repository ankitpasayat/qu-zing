interface TokenSelectorProps {
  tokenCounts: Record<number, number>; // token value -> count available
  selectedToken: number | null;
  onSelect: (token: number) => void;
  disabled?: boolean;
}

export function TokenSelector({ tokenCounts, selectedToken, onSelect, disabled = false }: TokenSelectorProps) {
  // Get available tokens (those with count > 0)
  const availableTokens = Object.entries(tokenCounts)
    .filter(([, count]) => count > 0)
    .map(([token]) => parseInt(token))
    .sort((a, b) => a - b);

  if (availableTokens.length === 0) {
    return (
      <div className="mt-6 p-5 game-card border-4 border-amber-400 dark:border-amber-500/60 bg-amber-50/90 dark:bg-amber-500/20 text-center relative animate-pop-in">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl animate-wiggle">😅</div>
        <p className="text-amber-700 dark:text-amber-300 font-black text-lg mt-2">No tokens remaining!</p>
        <p className="text-sm text-amber-600 dark:text-amber-400/70 mt-2 font-medium">You'll still earn points, just at 1x 💪</p>
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

  // Render a single token chip
  const renderToken = (token: number, isTop: boolean, stackIndex: number, totalInStack: number) => {
    const [color1, color2] = getTokenColors(token);
    const rgb = hexToRgb(color1);
    const isSelected = selectedToken === token;
    
    // Create muted versions for disabled state
    const disabledColor1 = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
    const disabledColor2 = `rgba(${Math.max(0, rgb.r - 40)}, ${Math.max(0, rgb.g - 40)}, ${Math.max(0, rgb.b - 40)}, 0.25)`;
    
    // Enhanced 3D stack effect - each chip in the stack is offset to create depth
    // Bottom chips peek out from behind, creating a casino chip pile look
    const stackOffset = totalInStack - 1 - stackIndex;
    const offsetY = isTop ? 0 : stackOffset * -6; // Stack upward (negative Y)
    const zIndex = stackIndex;
    
    // Darken bottom chips slightly to enhance depth perception
    const depthDarken = isTop ? 1 : 0.85 - (stackOffset * 0.1);
    const stackedColor1 = isTop ? color1 : `rgba(${Math.round(rgb.r * depthDarken)}, ${Math.round(rgb.g * depthDarken)}, ${Math.round(rgb.b * depthDarken)}, 1)`;
    const stackedColor2 = isTop ? color2 : `rgba(${Math.round(rgb.r * depthDarken * 0.7)}, ${Math.round(rgb.g * depthDarken * 0.7)}, ${Math.round(rgb.b * depthDarken * 0.7)}, 1)`;
    
    return (
      <div
        key={`${token}-${stackIndex}`}
        className={`absolute inset-0 rounded-full font-bold text-lg md:text-xl lg:text-2xl border-4 md:border-[6px] transition-all duration-200
          ${disabled 
            ? 'cursor-not-allowed border-gray-300/50 dark:border-gray-600/40 text-gray-400 dark:text-gray-500' 
            : isTop && isSelected 
              ? 'border-white text-white' 
              : isTop
                ? 'border-white/90 text-white'
                : 'border-white/60 text-white/0' // Bottom chips have subtle border, no text
          }`}
        style={{
          transform: `translateY(${offsetY}px)`,
          zIndex,
          boxShadow: disabled
            ? 'inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.1)'
            : isTop && isSelected 
              ? `0 0 25px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8), 0 0 40px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5), inset 0 3px 8px rgba(255, 255, 255, 0.4), inset 0 -3px 8px rgba(0, 0, 0, 0.3)` 
              : isTop
                ? 'inset 0 3px 6px rgba(255, 255, 255, 0.3), inset 0 -3px 6px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.5)'
                : 'inset 0 2px 4px rgba(255, 255, 255, 0.15), inset 0 -2px 4px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)',
          background: disabled
            ? `linear-gradient(135deg, ${disabledColor1}, ${disabledColor2})`
            : isTop && isSelected 
              ? `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4), transparent 50%), linear-gradient(135deg, ${color1}, ${color2})`
              : isTop
                ? `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), transparent 50%), linear-gradient(135deg, ${color1}, ${color2})`
                : `linear-gradient(135deg, ${stackedColor1}, ${stackedColor2})`
        }}
      >
        {/* Only show number on top token */}
        {isTop && (
          <span className={`absolute inset-0 flex items-center justify-center z-10 ${disabled ? 'drop-shadow-none' : 'drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]'}`}>
            {token}
          </span>
        )}
        {/* Edge notches to simulate poker chip texture */}
        <div className="absolute inset-0 rounded-full transition-opacity duration-200" style={{
          background: `repeating-conic-gradient(from 0deg, transparent 0deg 8deg, rgba(255, 255, 255, ${disabled ? '0.05' : isTop ? '0.15' : '0.08'}) 8deg 10deg)`,
          opacity: disabled ? 0.5 : 1
        }}></div>
        {/* Center ring detail - only on top chip */}
        {isTop && (
          <div className={`absolute inset-[30%] rounded-full border-2 transition-colors duration-200 ${disabled ? 'border-gray-400/10 dark:border-gray-500/10' : 'border-white/20'}`}></div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-6 animate-slide-in-up">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-xl">🎰</span>
        <p className={`text-base font-bold transition-colors ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
          {disabled ? 'Select an answer first!' : 'How confident are you? Bet a token:'}
        </p>
      </div>
      <div className="grid grid-cols-5 gap-3 md:gap-5 max-w-md md:max-w-2xl mx-auto transition-all duration-300">
        {availableTokens.map((token) => {
          const count = tokenCounts[token] || 0;
          const isSelected = selectedToken === token;
          // Extra height needed for stacked tokens
          const stackHeight = count > 1 ? (count - 1) * 6 : 0;
          
          return (
            <button
              key={token}
              onClick={() => !disabled && onSelect(token)}
              disabled={disabled}
              aria-disabled={disabled}
              title={disabled ? 'Select an answer first' : `Bet ${token} point${token > 1 ? 's' : ''} (${count} left)`}
              className={`relative w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 transition-all duration-200
                ${disabled 
                  ? 'cursor-not-allowed scale-95' 
                  : isSelected 
                    ? 'scale-110 z-10 animate-jelly' 
                    : 'hover:scale-105 hover:z-10 hover:rotate-3 active:scale-95'
                }`}
              style={{
                // Add padding at top for stacked chips that extend upward
                marginTop: stackHeight,
              }}
            >
              {/* Render stacked tokens from bottom to top */}
              {Array.from({ length: count }, (_, i) => 
                renderToken(token, i === count - 1, i, count)
              )}
              {/* Stack count badge for multiple tokens */}
              {count > 1 && (
                <div 
                  className="absolute -top-2 -right-1 w-6 h-6 md:w-7 md:h-7 bg-gradient-to-br from-yellow-300 to-yellow-500 dark:from-yellow-400 dark:to-yellow-600 rounded-full flex items-center justify-center text-xs md:text-sm font-black text-yellow-900 border-3 border-white shadow-lg animate-pop-in"
                  style={{ zIndex: count + 1, transform: `translateY(${-stackHeight}px)` }}
                >
                  {count}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {selectedToken && (
        <div className="text-center mt-5 animate-pop-in">
          <p className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-500/20 border-2 border-yellow-300 dark:border-yellow-500/50 rounded-xl text-sm font-bold text-yellow-700 dark:text-yellow-300">
            <span className="text-lg">💰</span>
            Correct = +{selectedToken} points • Wrong = lose token
            <span className="text-lg">🎲</span>
          </p>
        </div>
      )}
    </div>
  );
}
