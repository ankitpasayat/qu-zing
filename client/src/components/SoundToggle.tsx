import { useEffect } from 'react';
import { useSoundEffects, useCasinoJazz } from '../hooks/useSoundEffects';

export function SoundToggle() {
  const { toggleSound, isSoundEnabled, playSound } = useSoundEffects();
  const { isPlaying: isMusicPlaying, toggle: toggleMusic, start: startMusic } = useCasinoJazz();
  
  // Get current state directly from hooks
  const soundEnabled = isSoundEnabled();
  const musicEnabled = isMusicPlaying;

  // Auto-start music on first interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      startMusic();
      document.removeEventListener('click', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    return () => document.removeEventListener('click', handleFirstInteraction);
  }, [startMusic]);

  const handleSoundToggle = () => {
    const newState = toggleSound();
    if (newState) {
      playSound('click');
    }
  };

  const handleMusicToggle = () => {
    const newState = toggleMusic();
    if (newState) {
      playSound('ding');
    }
  };

  // This component is positioned by parent - no fixed positioning here
  return (
    <>
      {/* Music Toggle - fun wobbly style */}
      <button
        onClick={handleMusicToggle}
        className="game-control-btn group"
        title={musicEnabled ? 'Mute music' : 'Enable music'}
        aria-label={musicEnabled ? 'Mute music' : 'Enable music'}
        style={{ transform: 'rotate(-3deg)' }}
      >
        <span className="text-lg group-hover:animate-wiggle">
          {musicEnabled ? '🎵' : '🔇'}
        </span>
      </button>
      
      {/* Sound Effects Toggle */}
      <button
        onClick={handleSoundToggle}
        className="game-control-btn group"
        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        style={{ transform: 'rotate(2deg)' }}
      >
        <span className="text-lg group-hover:animate-wiggle">
          {soundEnabled ? '🔊' : '🔈'}
        </span>
      </button>
    </>
  );
}
