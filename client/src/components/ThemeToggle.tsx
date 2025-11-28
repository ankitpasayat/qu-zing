import { useTheme } from '../lib/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  // This component is positioned by parent - no fixed positioning here
  return (
    <button
      onClick={toggleTheme}
      className="game-control-btn group"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{ transform: 'rotate(-2deg)' }}
    >
      <span className="text-lg group-hover:animate-wiggle">
        {theme === 'dark' ? '☀️' : '🌙'}
      </span>
    </button>
  );
}

export default ThemeToggle;
