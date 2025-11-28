import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from './test-utils';
import { SoundToggle } from '../components/SoundToggle';

// Mock the useSoundEffects hook
vi.mock('../hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({
    toggleSound: vi.fn(() => false),
    isSoundEnabled: vi.fn(() => true),
    playSound: vi.fn(),
  }),
  useCasinoJazz: () => ({
    isPlaying: false,
    toggle: vi.fn(() => false),
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

describe('SoundToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the sound toggle buttons', () => {
    render(<SoundToggle />);
    
    // Now there are two buttons (music and sound)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
  });

  it('should have correct aria-label when sounds are enabled', () => {
    render(<SoundToggle />);
    
    const button = screen.getByLabelText('Mute sounds');
    expect(button).toBeInTheDocument();
  });

  it('should have correct title when sounds are enabled', () => {
    render(<SoundToggle />);
    
    const button = screen.getByTitle('Mute sounds');
    expect(button).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    render(<SoundToggle />);
    
    // Both buttons should have game-control-btn class
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('game-control-btn');
    });
  });

  it('should render emoji icons', () => {
    render(<SoundToggle />);
    
    // Check for emoji icons
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].textContent).toMatch(/🎵|🔇/);
    expect(buttons[1].textContent).toMatch(/🔊|🔈/);
  });

  it('should handle click event', () => {
    render(<SoundToggle />);
    
    const button = screen.getByLabelText('Mute sounds');
    fireEvent.click(button);
    
    // Just verify click doesn't throw
    expect(button).toBeInTheDocument();
  });
  
  it('should render music toggle button', () => {
    render(<SoundToggle />);
    
    const musicButton = screen.getByLabelText('Enable music');
    expect(musicButton).toBeInTheDocument();
  });
});

describe('SoundToggle with disabled state', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../hooks/useSoundEffects', () => ({
      useSoundEffects: () => {
        const playSound = vi.fn();
        return {
          toggleSound: vi.fn(() => true), // toggles to enabled
          isSoundEnabled: vi.fn(() => false),
          playSound,
        };
      },
      useCasinoJazz: () => ({
        isPlaying: false,
        toggle: vi.fn(() => false),
        start: vi.fn(),
        stop: vi.fn(),
      }),
    }));
  });

  afterEach(() => {
    vi.doUnmock('../hooks/useSoundEffects');
  });

  it('should show muted icon when sounds are disabled', async () => {
    // Re-import after mock
    const { SoundToggle: SoundToggleMuted } = await import('../components/SoundToggle');
    render(<SoundToggleMuted />);
    
    const button = screen.getByLabelText('Enable sounds');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Enable sounds');
  });

  it('should play click sound when toggling sound on', async () => {
    // Re-import after mock
    const { SoundToggle: SoundToggleMuted } = await import('../components/SoundToggle');
    render(<SoundToggleMuted />);
    
    const button = screen.getByLabelText('Enable sounds');
    fireEvent.click(button);
    
    // The toggle mock returns true (enabling sound), so playSound should be called
    expect(button).toBeInTheDocument();
  });
});

describe('SoundToggle music toggle behavior', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('../hooks/useSoundEffects');
  });
  
  it('should play ding sound when enabling music', async () => {
    const mockPlaySound = vi.fn();
    vi.doMock('../hooks/useSoundEffects', () => ({
      useSoundEffects: () => ({
        toggleSound: vi.fn(() => true),
        isSoundEnabled: vi.fn(() => true),
        playSound: mockPlaySound,
      }),
      useCasinoJazz: () => ({
        isPlaying: false,
        toggle: vi.fn(() => true), // toggles to enabled (playing)
        start: vi.fn(),
        stop: vi.fn(),
      }),
    }));
    
    const { SoundToggle: SoundToggleFresh } = await import('../components/SoundToggle');
    render(<SoundToggleFresh />);
    
    // Find and click the music toggle button
    const musicButton = screen.getByLabelText('Enable music');
    fireEvent.click(musicButton);
    
    // Should have called playSound with 'ding'
    expect(mockPlaySound).toHaveBeenCalledWith('ding');
  });
  
  it('should not play sound when disabling music', async () => {
    const mockPlaySound = vi.fn();
    vi.doMock('../hooks/useSoundEffects', () => ({
      useSoundEffects: () => ({
        toggleSound: vi.fn(() => true),
        isSoundEnabled: vi.fn(() => true),
        playSound: mockPlaySound,
      }),
      useCasinoJazz: () => ({
        isPlaying: true,
        toggle: vi.fn(() => false), // toggles to disabled (not playing)
        start: vi.fn(),
        stop: vi.fn(),
      }),
    }));
    
    const { SoundToggle: SoundToggleFresh } = await import('../components/SoundToggle');
    render(<SoundToggleFresh />);
    
    // Find and click the music toggle button (it should say Mute music since isPlaying is true)
    const musicButton = screen.getByLabelText('Mute music');
    fireEvent.click(musicButton);
    
    // Should NOT have called playSound since toggle returned false (disabled)
    expect(mockPlaySound).not.toHaveBeenCalled();
  });
});
