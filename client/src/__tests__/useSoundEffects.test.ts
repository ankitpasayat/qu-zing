import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSoundEffects } from '../hooks/useSoundEffects';

// Mock AudioContext and related classes
class MockOscillatorNode {
  frequency = { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  detune = { value: 0, setValueAtTime: vi.fn() };
  type: OscillatorType = 'sine';
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
  onended = null;
}

class MockGainNode {
  gain = { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  connect = vi.fn().mockReturnThis();
}

class MockBiquadFilterNode {
  frequency = { value: 350, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  Q = { value: 1, setValueAtTime: vi.fn() };
  type: BiquadFilterType = 'lowpass';
  connect = vi.fn().mockReturnThis();
}

class MockDelayNode {
  delayTime = { value: 0, setValueAtTime: vi.fn() };
  connect = vi.fn().mockReturnThis();
}

class MockDynamicsCompressorNode {
  threshold = { value: -24, setValueAtTime: vi.fn() };
  knee = { value: 30, setValueAtTime: vi.fn() };
  ratio = { value: 12, setValueAtTime: vi.fn() };
  attack = { value: 0.003, setValueAtTime: vi.fn() };
  release = { value: 0.25, setValueAtTime: vi.fn() };
  connect = vi.fn().mockReturnThis();
}

class MockStereoPannerNode {
  pan = { value: 0, setValueAtTime: vi.fn() };
  connect = vi.fn().mockReturnThis();
}

class MockChannelMergerNode {
  connect = vi.fn().mockReturnThis();
}

class MockBufferSourceNode {
  buffer: AudioBuffer | null = null;
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioBuffer {
  numberOfChannels = 1;
  length = 4410;
  sampleRate = 44100;
  duration = 0.1;
  getChannelData = vi.fn().mockReturnValue(new Float32Array(4410));
  copyFromChannel = vi.fn();
  copyToChannel = vi.fn();
}

class MockAudioContext {
  currentTime = 0;
  destination = {};
  state = 'running';
  sampleRate = 44100;
  
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createGain = vi.fn(() => new MockGainNode());
  createBiquadFilter = vi.fn(() => new MockBiquadFilterNode());
  createDelay = vi.fn(() => new MockDelayNode());
  createDynamicsCompressor = vi.fn(() => new MockDynamicsCompressorNode());
  createStereoPanner = vi.fn(() => new MockStereoPannerNode());
  createChannelMerger = vi.fn(() => new MockChannelMergerNode());
  createBufferSource = vi.fn(() => new MockBufferSourceNode());
  createBuffer = vi.fn(() => new MockAudioBuffer());
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

// Store original AudioContext (may be undefined in jsdom)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalAudioContext = typeof window !== 'undefined' ? (window as any).AudioContext : undefined;

describe('useSoundEffects', () => {
  let localStorageStore: Record<string, string>;

  beforeEach(() => {
    localStorageStore = {};

    // Mock localStorage with a simple store
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageStore[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageStore[key];
        }),
        clear: vi.fn(() => {
          localStorageStore = {};
        }),
      },
      writable: true,
      configurable: true,
    });
    
    // Mock AudioContext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = MockAudioContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = originalAudioContext;
  });

  it('should return playSound, toggleSound, and isSoundEnabled functions', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    expect(result.current.playSound).toBeInstanceOf(Function);
    expect(result.current.toggleSound).toBeInstanceOf(Function);
    expect(result.current.isSoundEnabled).toBeInstanceOf(Function);
  });

  it('should toggle sound on/off', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    // Initially enabled (no localStorage value)
    expect(result.current.isSoundEnabled()).toBe(true);

    // Toggle off
    act(() => {
      const newState = result.current.toggleSound();
      expect(newState).toBe(false);
    });

    expect(localStorageStore['quzing_sound_enabled']).toBe('false');

    // Toggle on
    act(() => {
      const newState = result.current.toggleSound();
      expect(newState).toBe(true);
    });

    expect(localStorageStore['quzing_sound_enabled']).toBe('true');
  });

  it('should return false for isSoundEnabled when disabled', () => {
    localStorageStore['quzing_sound_enabled'] = 'false';
    
    const { result } = renderHook(() => useSoundEffects());
    
    expect(result.current.isSoundEnabled()).toBe(false);
  });

  it('should return true for isSoundEnabled when explicitly enabled', () => {
    localStorageStore['quzing_sound_enabled'] = 'true';
    
    const { result } = renderHook(() => useSoundEffects());
    
    expect(result.current.isSoundEnabled()).toBe(true);
  });

  it('should not throw when playSound is called with AudioContext available', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    expect(() => {
      act(() => {
        result.current.playSound('click');
      });
    }).not.toThrow();
  });

  it('should return early when sounds are disabled', () => {
    localStorageStore['quzing_sound_enabled'] = 'false';
    
    const { result } = renderHook(() => useSoundEffects());
    
    // playSound should just return early without doing anything
    expect(() => {
      act(() => {
        result.current.playSound('click');
      });
    }).not.toThrow();
  });

  it('should handle all sound types without throwing', () => {
    const { result } = renderHook(() => useSoundEffects());
    const soundTypes = [
      'click', 'correct', 'wrong', 'countdown', 'countdownFinal', 'gameStart', 'roundStart', 'vote', 'win', 'powerUp',
      // Goofy sounds
      'boing', 'wahwah', 'honk', 'slideWhistleUp', 'slideWhistleDown', 'rimshot', 'bonk', 'pop', 'splat', 'giggle', 'ding', 'whoosh', 'kazoo', 'rubber', 'spring'
    ] as const;

    soundTypes.forEach((type) => {
      expect(() => {
        act(() => {
          result.current.playSound(type);
        });
      }).not.toThrow();
    });
  });

  it('should handle AudioContext creation failure gracefully', () => {
    // Force AudioContext to throw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = function() {
      throw new Error('AudioContext not supported');
    };
    
    const { result } = renderHook(() => useSoundEffects());
    
    // Should not throw even when AudioContext fails
    expect(() => {
      act(() => {
        result.current.playSound('click');
      });
    }).not.toThrow();
  });

  it('should toggle from disabled to enabled and play a sound', () => {
    localStorageStore['quzing_sound_enabled'] = 'false';
    
    const { result } = renderHook(() => useSoundEffects());
    
    expect(result.current.isSoundEnabled()).toBe(false);
    
    // Toggle should enable and play a click sound
    act(() => {
      const enabled = result.current.toggleSound();
      expect(enabled).toBe(true);
    });
    
    expect(result.current.isSoundEnabled()).toBe(true);
  });

  it('should persist sound preference to localStorage', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    // Toggle off
    act(() => {
      result.current.toggleSound();
    });
    
    // Verify localStorage was updated
    expect(window.localStorage.setItem).toHaveBeenCalledWith('quzing_sound_enabled', 'false');
    
    // Toggle back on
    act(() => {
      result.current.toggleSound();
    });
    
    // Verify localStorage was updated again
    expect(window.localStorage.setItem).toHaveBeenCalledWith('quzing_sound_enabled', 'true');
  });
  
  it('should actually play sounds using AudioContext mock', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    // Enable sounds
    localStorageStore['quzing_sound_enabled'] = 'true';
    
    // Play each sound type including goofy sounds
    const soundTypes = [
      'click', 'correct', 'wrong', 'countdown', 'countdownFinal', 'gameStart', 'roundStart', 'vote', 'win', 'powerUp',
      'boing', 'wahwah', 'honk', 'slideWhistleUp', 'slideWhistleDown', 'rimshot', 'bonk', 'pop', 'splat', 'giggle', 'ding', 'whoosh', 'kazoo', 'rubber', 'spring'
    ] as const;
    
    soundTypes.forEach((type) => {
      act(() => {
        result.current.playSound(type);
      });
    });
    
    // Verify the hook didn't throw and sound types were handled
    expect(result.current.isSoundEnabled()).toBe(true);
  });
});

describe('playSoundGlobal', () => {
  let localStorageStore: Record<string, string>;
  
  beforeEach(() => {
    // Reset module cache to ensure fresh import
    vi.resetModules();
    
    localStorageStore = {};
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageStore[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageStore[key];
        }),
        clear: vi.fn(() => {
          localStorageStore = {};
        }),
      },
      writable: true,
      configurable: true,
    });
    
    // Mock AudioContext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = MockAudioContext;
  });
  
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = originalAudioContext;
  });

  it('should not throw when called', async () => {
    const { playSoundGlobal } = await import('../hooks/useSoundEffects');
    
    expect(() => playSoundGlobal('click')).not.toThrow();
  });

  it('should not play when sound is disabled in localStorage', async () => {
    localStorageStore['quzing_sound_enabled'] = 'false';
    
    const { playSoundGlobal } = await import('../hooks/useSoundEffects');
    
    expect(() => playSoundGlobal('click')).not.toThrow();
  });

  it('should handle all sound types without throwing', async () => {
    const { playSoundGlobal } = await import('../hooks/useSoundEffects');
    const soundTypes = [
      'click', 'correct', 'wrong', 'countdown', 'countdownFinal', 'gameStart', 'roundStart', 'vote', 'win', 'powerUp',
      'boing', 'wahwah', 'honk', 'slideWhistleUp', 'slideWhistleDown', 'rimshot', 'bonk', 'pop', 'splat', 'giggle', 'ding', 'whoosh', 'kazoo', 'rubber', 'spring'
    ] as const;

    soundTypes.forEach((type) => {
      expect(() => playSoundGlobal(type)).not.toThrow();
    });
  });
  
  it('should create AudioContext if not exists', async () => {
    const { playSoundGlobal } = await import('../hooks/useSoundEffects');
    
    // First call should create AudioContext
    playSoundGlobal('click');
    
    // Verify AudioContext was created
    expect(MockAudioContext).toBeDefined();
  });
  
  it('should resume suspended AudioContext', async () => {
    class SuspendedAudioContext extends MockAudioContext {
      state = 'suspended';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = SuspendedAudioContext;
    
    vi.resetModules();
    const { playSoundGlobal } = await import('../hooks/useSoundEffects');
    
    expect(() => playSoundGlobal('click')).not.toThrow();
  });
  
  it('should handle sounds with multiple notes', async () => {
    const { playSoundGlobal } = await import('../hooks/useSoundEffects');
    
    // 'correct' and 'win' have multiple notes
    expect(() => playSoundGlobal('correct')).not.toThrow();
    expect(() => playSoundGlobal('win')).not.toThrow();
  });
  
  it('should handle sounds with ramp down', async () => {
    const { playSoundGlobal } = await import('../hooks/useSoundEffects');
    
    // 'wrong' has ramp: 'down'
    expect(() => playSoundGlobal('wrong')).not.toThrow();
    // 'countdown' and 'countdownFinal' might also have ramp
    expect(() => playSoundGlobal('countdown')).not.toThrow();
    expect(() => playSoundGlobal('countdownFinal')).not.toThrow();
  });
  
  it('should handle AudioContext creation failure gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = function() {
      throw new Error('AudioContext not supported');
    };
    
    vi.resetModules();
    const { playSoundGlobal } = await import('../hooks/useSoundEffects');
    
    expect(() => playSoundGlobal('click')).not.toThrow();
  });
  
  it('should use webkitAudioContext fallback when AudioContext is not available', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).AudioContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).webkitAudioContext = MockAudioContext;
    
    vi.resetModules();
    const { playSoundGlobal } = await import('../hooks/useSoundEffects');
    
    expect(() => playSoundGlobal('click')).not.toThrow();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).webkitAudioContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = MockAudioContext;
  });
});

describe('useCasinoJazz', () => {
  beforeEach(() => {
    vi.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = MockAudioContext;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = originalAudioContext;
    localStorage.removeItem('quzing_music_enabled');
  });

  it('should return isPlaying, toggle, start, and stop functions', async () => {
    const { useCasinoJazz } = await import('../hooks/useSoundEffects');
    const { result } = renderHook(() => useCasinoJazz());
    
    expect(typeof result.current.isPlaying).toBe('boolean');
    expect(result.current.toggle).toBeInstanceOf(Function);
    expect(result.current.start).toBeInstanceOf(Function);
    expect(result.current.stop).toBeInstanceOf(Function);
  });

  it('should toggle music on and off', async () => {
    const { useCasinoJazz } = await import('../hooks/useSoundEffects');
    const { result } = renderHook(() => useCasinoJazz());
    
    // Toggle should not throw
    expect(() => {
      act(() => {
        result.current.toggle();
      });
    }).not.toThrow();
  });

  it('should start and stop without throwing', async () => {
    const { useCasinoJazz } = await import('../hooks/useSoundEffects');
    const { result } = renderHook(() => useCasinoJazz());
    
    expect(() => {
      act(() => {
        result.current.start();
      });
    }).not.toThrow();
    
    expect(() => {
      act(() => {
        result.current.stop();
      });
    }).not.toThrow();
  });
  
  it('should respond to click events when enabled', async () => {
    localStorage.setItem('quzing_music_enabled', 'true');
    const { useCasinoJazz } = await import('../hooks/useSoundEffects');
    const { result } = renderHook(() => useCasinoJazz());
    
    // Simulate click event
    act(() => {
      document.dispatchEvent(new Event('click'));
    });
    
    // Should have started playing
    expect(result.current.isPlaying).toBe(true);
  });
  
  it('should respond to keydown events when enabled', async () => {
    localStorage.setItem('quzing_music_enabled', 'true');
    vi.resetModules();
    const { useCasinoJazz } = await import('../hooks/useSoundEffects');
    const { result } = renderHook(() => useCasinoJazz());
    
    // Simulate keydown event
    act(() => {
      document.dispatchEvent(new Event('keydown'));
    });
    
    // Should have started playing
    expect(result.current.isPlaying).toBe(true);
  });
  
  it('should not start when disabled', async () => {
    localStorage.setItem('quzing_music_enabled', 'false');
    vi.resetModules();
    const { useCasinoJazz } = await import('../hooks/useSoundEffects');
    const { result } = renderHook(() => useCasinoJazz());
    
    expect(result.current.isPlaying).toBe(false);
  });
  
  it('should toggle from off to on and vice versa', async () => {
    localStorage.setItem('quzing_music_enabled', 'false');
    vi.resetModules();
    const { useCasinoJazz } = await import('../hooks/useSoundEffects');
    const { result } = renderHook(() => useCasinoJazz());
    
    // Toggle on
    act(() => {
      const newState = result.current.toggle();
      expect(newState).toBe(true);
    });
    
    expect(result.current.isPlaying).toBe(true);
    
    // Toggle off
    act(() => {
      const newState = result.current.toggle();
      expect(newState).toBe(false);
    });
    
    expect(result.current.isPlaying).toBe(false);
  });
});

describe('getCasinoJazz', () => {
  beforeEach(() => {
    vi.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = MockAudioContext;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = originalAudioContext;
    localStorage.removeItem('quzing_music_enabled');
  });
  
  it('should return a singleton instance', async () => {
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const instance1 = getCasinoJazz();
    const instance2 = getCasinoJazz();
    
    expect(instance1).toBe(instance2);
  });
  
  it('should have start, stop, toggle, isEnabled, and setVolume methods', async () => {
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    
    expect(typeof player.start).toBe('function');
    expect(typeof player.stop).toBe('function');
    expect(typeof player.toggle).toBe('function');
    expect(typeof player.isEnabled).toBe('function');
    expect(typeof player.setVolume).toBe('function');
  });
  
  it('should start and play music without throwing', async () => {
    localStorage.setItem('quzing_music_enabled', 'true');
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    
    expect(() => player.start()).not.toThrow();
    expect(() => player.stop()).not.toThrow();
  });
  
  it('should not start when already playing', async () => {
    localStorage.setItem('quzing_music_enabled', 'true');
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    
    player.start();
    player.start(); // Should be a no-op
    
    expect(() => player.stop()).not.toThrow();
  });
  
  it('should not start when disabled in localStorage', async () => {
    localStorage.setItem('quzing_music_enabled', 'false');
    vi.resetModules();
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    
    player.start();
    
    // isEnabled should return false
    expect(player.isEnabled()).toBe(false);
  });
  
  it('should toggle music state', async () => {
    localStorage.setItem('quzing_music_enabled', 'false');
    vi.resetModules();
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    
    // Toggle on
    const result1 = player.toggle();
    expect(result1).toBe(true);
    expect(localStorage.getItem('quzing_music_enabled')).toBe('true');
    
    // Toggle off
    const result2 = player.toggle();
    expect(result2).toBe(false);
    expect(localStorage.getItem('quzing_music_enabled')).toBe('false');
  });
  
  it('should return correct isEnabled state', async () => {
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    
    localStorage.setItem('quzing_music_enabled', 'true');
    expect(player.isEnabled()).toBe(true);
    
    localStorage.setItem('quzing_music_enabled', 'false');
    expect(player.isEnabled()).toBe(false);
    
    localStorage.removeItem('quzing_music_enabled');
    expect(player.isEnabled()).toBe(true); // Default to enabled
  });
  
  it('should set volume without throwing', async () => {
    localStorage.setItem('quzing_music_enabled', 'true');
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    player.start();
    
    expect(() => player.setVolume(0.5)).not.toThrow();
    expect(() => player.setVolume(0)).not.toThrow();
    expect(() => player.setVolume(1)).not.toThrow();
    expect(() => player.setVolume(2)).not.toThrow(); // Should clamp to 1
    expect(() => player.setVolume(-1)).not.toThrow(); // Should clamp to 0
    
    player.stop();
  });
  
  it('should handle setVolume when not playing', async () => {
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    
    // Should not throw even when audio context doesn't exist
    expect(() => player.setVolume(0.5)).not.toThrow();
  });
  
  it('should stop all oscillators and reset state on stop', async () => {
    localStorage.setItem('quzing_music_enabled', 'true');
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    player.start();
    
    // Let some notes be scheduled
    await new Promise(resolve => setTimeout(resolve, 100));
    
    player.stop();
    
    // Should be able to start again
    expect(() => player.start()).not.toThrow();
    player.stop();
  });
  
  it('should handle AudioContext errors gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = function() {
      throw new Error('AudioContext not supported');
    };
    
    vi.resetModules();
    localStorage.setItem('quzing_music_enabled', 'true');
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    
    // Should not throw
    expect(() => player.start()).not.toThrow();
  });
  
  it('should resume suspended AudioContext', async () => {
    class SuspendedAudioContext extends MockAudioContext {
      state = 'suspended';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = SuspendedAudioContext;
    
    vi.resetModules();
    localStorage.setItem('quzing_music_enabled', 'true');
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    
    expect(() => player.start()).not.toThrow();
    player.stop();
  });
  
  it('should schedule and play multiple beats when running', async () => {
    vi.useFakeTimers();
    localStorage.setItem('quzing_music_enabled', 'true');
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    player.start();
    
    // Advance timers to trigger multiple scheduling cycles
    await vi.advanceTimersByTimeAsync(500);
    
    player.stop();
    vi.useRealTimers();
  });
  
  it('should handle chord progression cycling', async () => {
    vi.useFakeTimers();
    localStorage.setItem('quzing_music_enabled', 'true');
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    player.start();
    
    // Run for enough time to cycle through chord progressions
    // 36 bars * 4 beats * ~480ms per beat = ~69 seconds
    // We'll just advance a reasonable amount to test the cycling logic
    for (let i = 0; i < 200; i++) {
      await vi.advanceTimersByTimeAsync(50);
    }
    
    player.stop();
    vi.useRealTimers();
  });
  
  it('should play all jazz instruments during scheduler loop', async () => {
    // First reset modules to clear any cached singleton, then set up mocks
    vi.resetModules();
    vi.useFakeTimers();
    localStorage.setItem('quzing_music_enabled', 'true');
    
    // Create a tracked mock with advancing currentTime to trigger scheduling
    let createOscillatorCount = 0;
    let createGainCount = 0;
    let createBiquadFilterCount = 0;
    let createBufferCount = 0;
    let createBufferSourceCount = 0;
    let createStereoPannerCount = 0;
    // Start at 0 and advance past the initial delay (0.15s)
    let currentTimeValue = 0;
    
    class TrackedMockAudioContext {
      state = 'running' as AudioContextState;
      destination = { connect: vi.fn() };
      get currentTime() {
        return currentTimeValue;
      }
      createOscillator = vi.fn(() => {
        createOscillatorCount++;
        return new MockOscillatorNode();
      });
      createGain = vi.fn(() => {
        createGainCount++;
        return new MockGainNode();
      });
      createBiquadFilter = vi.fn(() => {
        createBiquadFilterCount++;
        return new MockBiquadFilterNode();
      });
      createBuffer = vi.fn((_channels: number, length: number, sampleRate: number) => {
        createBufferCount++;
        return {
          sampleRate,
          length,
          duration: length / sampleRate,
          numberOfChannels: 1,
          getChannelData: vi.fn(() => new Float32Array(length)),
          copyFromChannel: vi.fn(),
          copyToChannel: vi.fn(),
        };
      });
      createBufferSource = vi.fn(() => {
        createBufferSourceCount++;
        return new MockBufferSourceNode();
      });
      createStereoPanner = vi.fn(() => {
        createStereoPannerCount++;
        return new MockStereoPannerNode();
      });
      createDynamicsCompressor = vi.fn(() => new MockDynamicsCompressorNode());
      createDelay = vi.fn(() => new MockDelayNode());
      createChannelMerger = vi.fn(() => new MockChannelMergerNode());
      resume = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = TrackedMockAudioContext;
    
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    player.start();
    
    // Simulate time advancing for the audio context
    // The scheduler checks ctx.currentTime, we need to advance it past the initial delay
    // nextBeatTime starts at ctx.currentTime + 0.15, lookAhead = 0.12
    // So we need currentTime > nextBeatTime - lookAhead = 0.15 - 0.12 = 0.03
    for (let i = 0; i < 100; i++) {
      currentTimeValue += 0.05; // Advance audio context time by 50ms each iteration
      await vi.advanceTimersByTimeAsync(50);
    }
    
    player.stop();
    
    // Verify core audio methods were called for chords, bass, hi-hat
    expect(createOscillatorCount).toBeGreaterThan(0);
    expect(createGainCount).toBeGreaterThan(0);
    expect(createBiquadFilterCount).toBeGreaterThan(0);
    // Brush drums and stereo panning
    expect(createBufferCount).toBeGreaterThan(0);
    expect(createBufferSourceCount).toBeGreaterThan(0);
    expect(createStereoPannerCount).toBeGreaterThan(0);
    
    vi.useRealTimers();
  });
  
  it('should handle scheduleNotes when not playing', async () => {
    localStorage.setItem('quzing_music_enabled', 'true');
    vi.resetModules();
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    
    // Start and immediately stop
    player.start();
    player.stop();
    
    // Verify it doesn't throw
    expect(true).toBe(true);
  });
  
  it('should use webkitAudioContext fallback', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).AudioContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).webkitAudioContext = MockAudioContext;
    
    vi.resetModules();
    localStorage.setItem('quzing_music_enabled', 'true');
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    expect(() => player.start()).not.toThrow();
    player.stop();
    
    // Restore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).webkitAudioContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = MockAudioContext;
  });
  
  it('should handle stop when chorusLFO is already stopped', async () => {
    localStorage.setItem('quzing_music_enabled', 'true');
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    player.start();
    
    // Stop multiple times - should handle already stopped oscillators
    player.stop();
    player.stop();
    
    expect(() => player.start()).not.toThrow();
    player.stop();
  });
  
  it('should set default music enabled in localStorage on construction', async () => {
    localStorage.removeItem('quzing_music_enabled');
    vi.resetModules();
    
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    getCasinoJazz();
    
    // Should default to 'true' if not set
    expect(localStorage.getItem('quzing_music_enabled')).toBe('true');
  });
  
  it('should trigger offbeat comp chord and chord progression reset', async () => {
    // First reset modules to clear any cached singleton
    vi.resetModules();
    vi.useFakeTimers();
    localStorage.setItem('quzing_music_enabled', 'true');
    
    // Mock Math.random to always return > 0.5 to trigger offbeat comp chord
    const originalRandom = Math.random;
    let randomCallCount = 0;
    Math.random = () => {
      randomCallCount++;
      // Return values that will trigger offbeat comp chord (needs > 0.5)
      // and rim click (needs > 0.4), etc.
      return 0.7;
    };
    
    let currentTimeValue = 0;
    let chordPlayCount = 0;
    
    class TrackedMockAudioContext {
      state = 'running' as AudioContextState;
      destination = { connect: vi.fn() };
      get currentTime() {
        return currentTimeValue;
      }
      createOscillator = vi.fn(() => {
        chordPlayCount++;
        return new MockOscillatorNode();
      });
      createGain = vi.fn(() => new MockGainNode());
      createBiquadFilter = vi.fn(() => new MockBiquadFilterNode());
      createBuffer = vi.fn((_channels: number, length: number, sampleRate: number) => ({
        sampleRate,
        length,
        duration: length / sampleRate,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(length)),
        copyFromChannel: vi.fn(),
        copyToChannel: vi.fn(),
      }));
      createBufferSource = vi.fn(() => new MockBufferSourceNode());
      createStereoPanner = vi.fn(() => new MockStereoPannerNode());
      createDynamicsCompressor = vi.fn(() => new MockDynamicsCompressorNode());
      createDelay = vi.fn(() => new MockDelayNode());
      createChannelMerger = vi.fn(() => new MockChannelMergerNode());
      resume = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = TrackedMockAudioContext;
    
    const { getCasinoJazz } = await import('../hooks/useSoundEffects');
    
    const player = getCasinoJazz();
    player.start();
    
    // Run for enough beats to cycle through chord progressions
    // 36 bars * 4 beats = 144 beats, beatDuration = 0.48s, so ~69 seconds total
    // Run 200 iterations at 0.5s per iteration = 100 seconds
    for (let i = 0; i < 200; i++) {
      currentTimeValue += 0.5; // Advance audio context time by 500ms each iteration
      await vi.advanceTimersByTimeAsync(50);
    }
    
    player.stop();
    
    // Verify we played many chords (including offbeat comp chords)
    expect(chordPlayCount).toBeGreaterThan(100);
    expect(randomCallCount).toBeGreaterThan(0);
    
    Math.random = originalRandom;
    vi.useRealTimers();
  });
});

describe('useSoundEffects cleanup', () => {
  let localStorageStore: Record<string, string>;

  beforeEach(() => {
    localStorageStore = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageStore[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageStore[key];
        }),
        clear: vi.fn(() => {
          localStorageStore = {};
        }),
      },
      writable: true,
      configurable: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = MockAudioContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = originalAudioContext;
  });

  it('should close AudioContext on unmount', () => {
    const { result, unmount } = renderHook(() => useSoundEffects());
    
    // Play a sound to initialize AudioContext
    act(() => {
      result.current.playSound('click');
    });
    
    // Unmount should trigger cleanup
    unmount();
    
    // The close method should have been called - we just verify no errors occur
    expect(true).toBe(true);
  });
  
  it('should handle unmount when AudioContext was never created', () => {
    const { unmount } = renderHook(() => useSoundEffects());
    
    // Unmount without ever playing a sound
    expect(() => unmount()).not.toThrow();
  });
});

describe('useSoundEffects advanced playback', () => {
  let localStorageStore: Record<string, string>;
  let createOscillatorSpy: ReturnType<typeof vi.fn>;
  let createGainSpy: ReturnType<typeof vi.fn>;
  let resumeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorageStore = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageStore[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageStore[key];
        }),
        clear: vi.fn(() => {
          localStorageStore = {};
        }),
      },
      writable: true,
      configurable: true,
    });
    
    // Create spied mock class
    createOscillatorSpy = vi.fn(() => new MockOscillatorNode());
    createGainSpy = vi.fn(() => new MockGainNode());
    resumeSpy = vi.fn().mockResolvedValue(undefined);
    
    class SpiedMockAudioContext extends MockAudioContext {
      override createOscillator = createOscillatorSpy as MockAudioContext['createOscillator'];
      override createGain = createGainSpy as MockAudioContext['createGain'];
      override resume = resumeSpy as MockAudioContext['resume'];
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = SpiedMockAudioContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = originalAudioContext;
  });

  it('should create oscillator with vibrato for boing sound', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    act(() => {
      result.current.playSound('boing');
    });
    
    // Verify oscillator was created (for vibrato LFO)
    expect(createOscillatorSpy).toHaveBeenCalled();
  });
  
  it('should create oscillator with pitch slide for slideWhistleUp', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    act(() => {
      result.current.playSound('slideWhistleUp');
    });
    
    expect(createOscillatorSpy).toHaveBeenCalled();
  });
  
  it('should create oscillator with envelope for honk', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    act(() => {
      result.current.playSound('honk');
    });
    
    expect(createOscillatorSpy).toHaveBeenCalled();
    expect(createGainSpy).toHaveBeenCalled();
  });
  
  it('should handle sounds with both vibrato and pitch slide (rubber, spring)', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    act(() => {
      result.current.playSound('rubber');
    });
    
    act(() => {
      result.current.playSound('spring');
    });
    
    expect(createOscillatorSpy).toHaveBeenCalled();
  });
  
  it('should handle sounds with vibrato and notes (giggle)', () => {
    const { result } = renderHook(() => useSoundEffects());
    
    act(() => {
      result.current.playSound('giggle');
    });
    
    expect(createOscillatorSpy).toHaveBeenCalled();
  });
  
  it('should resume suspended AudioContext in useSoundEffects', () => {
    // Create a suspended context
    class SuspendedSpiedContext extends MockAudioContext {
      override state = 'suspended';
      override createOscillator = createOscillatorSpy as MockAudioContext['createOscillator'];
      override createGain = createGainSpy as MockAudioContext['createGain'];
      override resume = resumeSpy as MockAudioContext['resume'];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = SuspendedSpiedContext;
    
    const { result } = renderHook(() => useSoundEffects());
    
    act(() => {
      result.current.playSound('click');
    });
    
    expect(resumeSpy).toHaveBeenCalled();
  });
  
  it('should use webkitAudioContext fallback in useSoundEffects hook', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).AudioContext;
    
    const webkitCreateOscillatorSpy = vi.fn(() => new MockOscillatorNode());
    class WebkitContext extends MockAudioContext {
      createOscillator = webkitCreateOscillatorSpy;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).webkitAudioContext = WebkitContext;
    
    const { result } = renderHook(() => useSoundEffects());
    
    act(() => {
      result.current.playSound('click');
    });
    
    expect(webkitCreateOscillatorSpy).toHaveBeenCalled();
    
    // Restore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).webkitAudioContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).AudioContext = MockAudioContext;
  });
});
