import { ThemeToggle } from './ThemeToggle';
import { SoundToggle } from './SoundToggle';

interface GameControlsProps {
  showExitButton?: boolean;
  onExit?: () => void;
  lobbyCode?: string;
  onCopyCode?: () => void;
  codeCopied?: boolean;
}

/**
 * Unified game controls component that handles:
 * - Theme toggle
 * - Sound toggles (music + effects)
 * - Lobby code display (optional)
 * - Exit button (optional)
 */
export function GameControls({ 
  showExitButton, 
  onExit,
  lobbyCode,
  onCopyCode,
  codeCopied 
}: GameControlsProps) {
  return (
    <>
      {/* Exit button - top left with playful style */}
      {showExitButton && onExit && (
        <button
          onClick={onExit}
          className="fixed top-3 left-3 z-50 game-control-btn hover:!bg-red-100 dark:hover:!bg-red-900/30 group"
          title="Leave game"
          style={{ transform: 'rotate(3deg)' }}
        >
          <span className="text-lg group-hover:animate-shake">🚪</span>
        </button>
      )}
      
      {/* Top right control stack - vertical stacking for mobile friendliness */}
      <div className="fixed top-3 right-3 z-50 flex flex-col gap-2 items-end">
        {/* Lobby code badge - if provided */}
        {lobbyCode && (
          <button
            onClick={onCopyCode}
            className="game-code-badge group"
            title="Click to copy lobby code"
            style={{ transform: 'rotate(-1deg)' }}
          >
            <span className="text-xs opacity-70">CODE</span>
            <span className="font-mono font-black text-lg tracking-wider">{lobbyCode}</span>
            {codeCopied ? (
              <span className="text-green-500 text-sm animate-pop-in">✓</span>
            ) : (
              <span className="text-xs opacity-50 group-hover:opacity-100">📋</span>
            )}
          </button>
        )}
        
        {/* Control buttons row */}
        <div className="flex gap-1.5">
          <ThemeToggle />
          <SoundToggle />
        </div>
      </div>
    </>
  );
}
