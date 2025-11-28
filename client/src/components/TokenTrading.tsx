import { useState } from 'react';
import { getAvailableTokens, getCombineResult, getSplitResult } from '../types/game';

interface TokenTradingProps {
  tokenCounts: Record<number, number>;
  onTradeUp: (sourceValue: number) => void;
  onTradeDown: (sourceValue: number) => void;
  disabled?: boolean;
}

export function TokenTrading({ 
  tokenCounts, 
  onTradeUp, 
  onTradeDown, 
  disabled = false 
}: TokenTradingProps) {
  const [showTrading, setShowTrading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);

  const availableTokens = getAvailableTokens(tokenCounts);

  // Combine (Fuse): Need 2+ of same value. Result is min(2N, 10).
  const canCombine = (value: number) => {
    return tokenCounts[value] >= 2;
  };

  // Split (Fission): Need 1+ of value >= 2.
  const canSplit = (value: number) => {
    return tokenCounts[value] >= 1 && value >= 2;
  };

  const tradableUpTokens = availableTokens.filter(canCombine);
  const tradableDownTokens = availableTokens.filter(canSplit);

  if (tradableUpTokens.length === 0 && tradableDownTokens.length === 0) {
    return null;
  }

  const getTokenColors = (val: number): string => {
    const colors: Record<number, string> = {
      1: 'bg-red-500',
      2: 'bg-orange-500',
      3: 'bg-amber-500',
      4: 'bg-yellow-500',
      5: 'bg-lime-500',
      6: 'bg-emerald-500',
      7: 'bg-cyan-500',
      8: 'bg-blue-500',
      9: 'bg-purple-500',
      10: 'bg-pink-500',
    };
    return colors[val] || 'bg-gray-500';
  };

  const handleCombine = () => {
    if (selectedToken && canCombine(selectedToken)) {
      onTradeUp(selectedToken);
      setSelectedToken(null);
      setShowTrading(false);
    }
  };

  const handleSplit = () => {
    if (selectedToken && canSplit(selectedToken)) {
      onTradeDown(selectedToken);
      setSelectedToken(null);
      setShowTrading(false);
    }
  };

  if (!showTrading) {
    return (
      <button
        onClick={() => setShowTrading(true)}
        disabled={disabled}
        className="text-sm text-purple-400 hover:text-purple-300 underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        🔄 Token Alchemy
      </button>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-[#231942]/80 border border-purple-200 dark:border-purple-700/50 rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">Token Alchemy</h3>
        <button
          onClick={() => {
            setShowTrading(false);
            setSelectedToken(null);
          }}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {/* Token selection */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Select a token to transmute:</p>
        <div className="flex flex-wrap gap-2">
          {availableTokens.map(token => {
            const count = tokenCounts[token];
            const isSelected = selectedToken === token;
            const canUp = canCombine(token);
            const canDown = canSplit(token);
            
            if (!canUp && !canDown) return null;

            return (
              <button
                key={token}
                onClick={() => setSelectedToken(isSelected ? null : token)}
                className={`
                  relative w-10 h-10 rounded-full font-bold text-white text-sm
                  transition-all ${getTokenColors(token)}
                  ${isSelected ? 'ring-2 ring-yellow-400 scale-110' : 'hover:scale-105'}
                `}
              >
                {token}
                {count > 1 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-yellow-900 text-xs rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trade options */}
      {selectedToken && (
        <div className="space-y-2 border-t border-purple-200 dark:border-purple-700/50 pt-3">
          {canCombine(selectedToken) && (
            <button
              onClick={handleCombine}
              disabled={disabled}
              className="w-full flex items-center justify-between p-3 bg-green-100 dark:bg-green-500/20 hover:bg-green-200 dark:hover:bg-green-500/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <span className="text-sm text-green-700 dark:text-green-300">
                Fuse: 2×{selectedToken} → 1×{getCombineResult(selectedToken).value}
              </span>
              <span className="text-green-600 dark:text-green-400 font-medium">✨</span>
            </button>
          )}
          
          {canSplit(selectedToken) && (
            <button
              onClick={handleSplit}
              disabled={disabled}
              className="w-full flex items-center justify-between p-3 bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Split: 1×{selectedToken} → {getSplitResult(selectedToken).values.join(' + ')}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">⚡</span>
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        💡 Fuse tokens to consolidate power, or Split them to spread risk!
      </p>
    </div>
  );
}
