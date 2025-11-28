import { useCallback, useRef, useEffect, useState } from 'react';

// Sound effect types - exported for use in components
export type SoundType = 
  | 'click' 
  | 'correct' 
  | 'wrong' 
  | 'countdown' 
  | 'countdownFinal'
  | 'gameStart' 
  | 'roundStart'
  | 'vote'
  | 'win'
  | 'powerUp'
  // Goofy sounds
  | 'boing'
  | 'wahwah'
  | 'honk'
  | 'slideWhistleUp'
  | 'slideWhistleDown'
  | 'rimshot'
  | 'bonk'
  | 'pop'
  | 'splat'
  | 'giggle'
  | 'ding'
  | 'whoosh'
  | 'kazoo'
  | 'rubber'
  | 'spring';

// Synthesized sound parameters
interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  ramp?: 'up' | 'down' | 'none';
  notes?: number[];
  // Extended goofy sound params
  vibrato?: { rate: number; depth: number };
  pitchSlide?: { start: number; end: number };
  envelope?: { attack: number; decay: number; sustain: number; release: number };
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  click: { frequency: 800, duration: 0.05, type: 'sine', gain: 0.5 },
  correct: { frequency: 523, duration: 0.15, type: 'sine', gain: 0.6, notes: [523, 659, 784] }, // C-E-G chord
  wrong: { frequency: 200, duration: 0.25, type: 'sawtooth', gain: 0.4, ramp: 'down' },
  countdown: { frequency: 440, duration: 0.1, type: 'sine', gain: 0.4 },
  countdownFinal: { frequency: 880, duration: 0.2, type: 'sine', gain: 0.6 },
  gameStart: { frequency: 440, duration: 0.15, type: 'sine', gain: 0.5, notes: [440, 554, 659, 880] },
  roundStart: { frequency: 660, duration: 0.12, type: 'sine', gain: 0.5, notes: [660, 880] },
  vote: { frequency: 600, duration: 0.08, type: 'sine', gain: 0.4 },
  win: { frequency: 523, duration: 0.2, type: 'sine', gain: 0.7, notes: [523, 659, 784, 1047] },
  powerUp: { frequency: 880, duration: 0.1, type: 'sine', gain: 0.5, notes: [880, 1100, 1320] },
  
  // Goofy sounds
  boing: { frequency: 150, duration: 0.3, type: 'sine', gain: 0.6, vibrato: { rate: 15, depth: 50 }, pitchSlide: { start: 150, end: 600 } },
  wahwah: { frequency: 300, duration: 0.5, type: 'sawtooth', gain: 0.4, vibrato: { rate: 8, depth: 100 } },
  honk: { frequency: 180, duration: 0.25, type: 'sawtooth', gain: 0.5, envelope: { attack: 0.01, decay: 0.05, sustain: 0.7, release: 0.1 } },
  slideWhistleUp: { frequency: 200, duration: 0.4, type: 'sine', gain: 0.5, pitchSlide: { start: 200, end: 1200 } },
  slideWhistleDown: { frequency: 1200, duration: 0.4, type: 'sine', gain: 0.5, pitchSlide: { start: 1200, end: 200 } },
  rimshot: { frequency: 400, duration: 0.15, type: 'triangle', gain: 0.7, notes: [400, 600, 200] },
  bonk: { frequency: 80, duration: 0.15, type: 'sine', gain: 0.6, pitchSlide: { start: 300, end: 80 } },
  pop: { frequency: 600, duration: 0.05, type: 'sine', gain: 0.7, pitchSlide: { start: 1000, end: 600 } },
  splat: { frequency: 100, duration: 0.3, type: 'sawtooth', gain: 0.4, pitchSlide: { start: 400, end: 50 } },
  giggle: { frequency: 800, duration: 0.4, type: 'sine', gain: 0.4, vibrato: { rate: 20, depth: 80 }, notes: [800, 1000, 900, 1100] },
  ding: { frequency: 1200, duration: 0.3, type: 'sine', gain: 0.5, envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 } },
  whoosh: { frequency: 100, duration: 0.3, type: 'sawtooth', gain: 0.3, pitchSlide: { start: 100, end: 2000 } },
  kazoo: { frequency: 440, duration: 0.2, type: 'sawtooth', gain: 0.3, vibrato: { rate: 30, depth: 30 } },
  rubber: { frequency: 200, duration: 0.25, type: 'sine', gain: 0.5, vibrato: { rate: 25, depth: 100 }, pitchSlide: { start: 200, end: 500 } },
  spring: { frequency: 100, duration: 0.5, type: 'sine', gain: 0.5, vibrato: { rate: 12, depth: 200 }, pitchSlide: { start: 100, end: 800 } },
};

// LocalStorage key for sound preferences
const SOUND_ENABLED_KEY = 'quzing_sound_enabled';

export function useSoundEffects() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef<boolean>(
    typeof window === 'undefined' 
      ? true 
      : localStorage.getItem(SOUND_ENABLED_KEY) !== 'false'
  );

  // Initialize audio context on first user interaction
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play a synthesized sound with full goofy effects support
  const playSound = useCallback((type: SoundType) => {
    // Check if sounds are enabled
    const enabled = localStorage.getItem(SOUND_ENABLED_KEY);
    if (enabled === 'false') return;

    try {
      const ctx = initAudioContext();
      const config = SOUND_CONFIGS[type];
      const now = ctx.currentTime;

      // Create master gain node for volume control
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(config.gain, now);

      // Play multiple notes for chord effects
      const notes = config.notes || [config.frequency];
      const noteDelay = config.notes ? 0.05 : 0;

      notes.forEach((freq, index) => {
        const startTime = now + index * noteDelay;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        
        osc.type = config.type;
        
        // Handle pitch slide
        if (config.pitchSlide) {
          osc.frequency.setValueAtTime(config.pitchSlide.start, startTime);
          osc.frequency.exponentialRampToValueAtTime(config.pitchSlide.end, startTime + config.duration);
        } else {
          osc.frequency.setValueAtTime(freq, startTime);
        }
        
        // Handle vibrato (frequency modulation for wobbly effects)
        if (config.vibrato) {
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.type = 'sine';
          lfo.frequency.setValueAtTime(config.vibrato.rate, startTime);
          lfoGain.gain.setValueAtTime(config.vibrato.depth, startTime);
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start(startTime);
          lfo.stop(startTime + config.duration + 0.01);
        }
        
        // Handle envelope (ADSR)
        if (config.envelope) {
          const { attack, decay, sustain, release } = config.envelope;
          const gainValue = config.gain / notes.length;
          noteGain.gain.setValueAtTime(0.001, startTime);
          noteGain.gain.exponentialRampToValueAtTime(gainValue, startTime + attack);
          noteGain.gain.exponentialRampToValueAtTime(gainValue * sustain, startTime + attack + decay);
          noteGain.gain.setValueAtTime(gainValue * sustain, startTime + config.duration - release);
          noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + config.duration);
        } else {
          noteGain.gain.setValueAtTime(config.gain / notes.length, startTime);
          // Apply frequency ramp if specified (legacy)
          if (config.ramp === 'down') {
            osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + config.duration);
          } else if (config.ramp === 'up') {
            osc.frequency.exponentialRampToValueAtTime(freq * 2, startTime + config.duration);
          }
          // Fade out to prevent click
          noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + config.duration);
        }
        
        osc.start(startTime);
        osc.stop(startTime + config.duration + 0.01);
      });
    } catch (e) {
      // Silently fail if audio isn't available
      console.debug('Sound playback failed:', e);
    }
  }, [initAudioContext]);

  // Toggle sounds on/off
  const toggleSound = useCallback(() => {
    const current = localStorage.getItem(SOUND_ENABLED_KEY);
    const newValue = current === 'false' ? 'true' : 'false';
    localStorage.setItem(SOUND_ENABLED_KEY, newValue);
    soundEnabledRef.current = newValue === 'true';
    
    // Play a click sound to confirm toggle (if turning on)
    if (newValue === 'true') {
      playSound('click');
    }
    
    return newValue === 'true';
  }, [playSound]);

  // Check if sounds are enabled
  const isSoundEnabled = useCallback(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === 'true';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    playSound,
    toggleSound,
    isSoundEnabled,
  };
}

// ============================================================================
// CASINO JAZZ BACKGROUND MUSIC
// A procedurally generated smooth jazz loop that plays constantly at low volume
// ============================================================================

const MUSIC_ENABLED_KEY = 'quzing_music_enabled';
const MUSIC_VOLUME = 0.14; // 14% max volume for background ambiance

// Jazz chord progressions (ii-V-I and variations) - extended voicings
const JAZZ_CHORDS = [
  [146.83, 174.61, 220.00, 261.63, 329.63], // Dm9
  [196.00, 246.94, 293.66, 349.23, 440.00], // G13
  [130.81, 164.81, 196.00, 246.94, 311.13], // Cmaj9
  [174.61, 220.00, 261.63, 329.63, 392.00], // Em9
  [110.00, 138.59, 164.81, 207.65, 261.63], // Am9
  [146.83, 185.00, 220.00, 277.18, 349.23], // D9
  [196.00, 246.94, 293.66, 392.00, 493.88], // Gmaj9
  [123.47, 155.56, 185.00, 233.08, 293.66], // Bm7b5
  [164.81, 207.65, 246.94, 311.13, 415.30], // E7#9
];

// Walking bass notes with chromatic passing tones
const BASS_NOTES = [
  { root: 146.83, passing: 155.56 }, // D -> Eb
  { root: 196.00, passing: 185.00 }, // G -> F#
  { root: 130.81, passing: 138.59 }, // C -> Db
  { root: 110.00, passing: 116.54 }, // A -> Bb
  { root: 146.83, passing: 138.59 }, // D -> Db
  { root: 196.00, passing: 207.65 }, // G -> Ab
  { root: 130.81, passing: 123.47 }, // C -> B
  { root: 164.81, passing: 155.56 }, // E -> Eb
];

class CasinoJazzPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbInput: GainNode | null = null;
  private reverbOutput: GainNode | null = null;
  private chorusDelayL: DelayNode | null = null;
  private chorusDelayR: DelayNode | null = null;
  private chorusLFO: OscillatorNode | null = null;
  private isPlaying = false;
  private chordIndex = 0;
  private nextBeatTime = 0;
  private schedulerTimer: number | null = null;
  private oscillators: OscillatorNode[] = [];
  private swingAmount = 0.055; // Jazz swing timing offset in seconds
  private beatCount = 0;

  constructor() {
    // Check localStorage for music preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(MUSIC_ENABLED_KEY);
      // Default to enabled if not set
      if (stored === null) {
        localStorage.setItem(MUSIC_ENABLED_KEY, 'true');
      }
    }
  }

  private initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const ctx = this.audioContext;

      // === COMPRESSOR (glues the mix) ===
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-20, ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, ctx.currentTime);
      this.compressor.ratio.setValueAtTime(3, ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, ctx.currentTime);

      // === MASTER GAIN ===
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(MUSIC_VOLUME, ctx.currentTime);

      // === ALGORITHMIC REVERB (multi-tap delay network) ===
      this.reverbInput = ctx.createGain();
      this.reverbOutput = ctx.createGain();
      this.reverbOutput.gain.setValueAtTime(0.4, ctx.currentTime);

      // Create comb filter delays for reverb
      const delayTimes = [0.029, 0.037, 0.041, 0.053, 0.067, 0.079];
      delayTimes.forEach((time, i) => {
        const delay = ctx.createDelay(1.0);
        delay.delayTime.setValueAtTime(time + Math.random() * 0.005, ctx.currentTime);
        
        const feedback = ctx.createGain();
        feedback.gain.setValueAtTime(0.35 + Math.random() * 0.08, ctx.currentTime);
        
        // High-cut filter on reverb tail for warmth
        const highCut = ctx.createBiquadFilter();
        highCut.type = 'lowpass';
        highCut.frequency.setValueAtTime(4000 - i * 300, ctx.currentTime);
        highCut.Q.setValueAtTime(0.5, ctx.currentTime);

        this.reverbInput!.connect(delay);
        delay.connect(highCut);
        highCut.connect(feedback);
        feedback.connect(delay); // feedback loop
        highCut.connect(this.reverbOutput!);
      });

      // Allpass diffuser for density
      const allpass1 = ctx.createDelay();
      allpass1.delayTime.setValueAtTime(0.011, ctx.currentTime);
      const allpassGain1 = ctx.createGain();
      allpassGain1.gain.setValueAtTime(0.6, ctx.currentTime);
      
      const allpass2 = ctx.createDelay();
      allpass2.delayTime.setValueAtTime(0.017, ctx.currentTime);
      const allpassGain2 = ctx.createGain();
      allpassGain2.gain.setValueAtTime(0.5, ctx.currentTime);

      this.reverbOutput.connect(allpass1);
      allpass1.connect(allpassGain1);
      allpassGain1.connect(allpass2);
      allpass2.connect(allpassGain2);
      allpassGain2.connect(this.reverbOutput);

      // === STEREO CHORUS (lush width) ===
      this.chorusDelayL = ctx.createDelay();
      this.chorusDelayL.delayTime.setValueAtTime(0.012, ctx.currentTime);
      this.chorusDelayR = ctx.createDelay();
      this.chorusDelayR.delayTime.setValueAtTime(0.018, ctx.currentTime);

      const chorusGainL = ctx.createGain();
      chorusGainL.gain.setValueAtTime(0.35, ctx.currentTime);
      const chorusGainR = ctx.createGain();
      chorusGainR.gain.setValueAtTime(0.35, ctx.currentTime);

      // LFO for chorus modulation
      this.chorusLFO = ctx.createOscillator();
      this.chorusLFO.type = 'sine';
      this.chorusLFO.frequency.setValueAtTime(0.7 + Math.random() * 0.3, ctx.currentTime);

      const lfoGainL = ctx.createGain();
      lfoGainL.gain.setValueAtTime(0.004, ctx.currentTime);
      const lfoGainR = ctx.createGain();
      lfoGainR.gain.setValueAtTime(-0.004, ctx.currentTime); // inverted for stereo width

      this.chorusLFO.connect(lfoGainL);
      this.chorusLFO.connect(lfoGainR);
      lfoGainL.connect(this.chorusDelayL.delayTime);
      lfoGainR.connect(this.chorusDelayR.delayTime);

      // Stereo merger
      const merger = ctx.createChannelMerger(2);
      this.chorusDelayL.connect(chorusGainL);
      this.chorusDelayR.connect(chorusGainR);
      chorusGainL.connect(merger, 0, 0);
      chorusGainR.connect(merger, 0, 1);

      // === SIGNAL CHAIN ===
      // Dry + Chorus -> Reverb -> Compressor -> Master -> Destination
      this.reverbOutput.connect(this.compressor);
      merger.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);

      // Start chorus LFO
      this.chorusLFO.start();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  // Rhodes-like electric piano voice with FM bell attack and filter envelope
  private playChord(chord: number[], startTime: number, duration: number) {
    if (!this.audioContext || !this.reverbInput) return;

    const ctx = this.audioContext;
    
    chord.forEach((freq, i) => {
      // === FM SYNTHESIS for bell-like attack ===
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();

      // Modulator for FM bell partials
      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(freq * (2 + Math.random() * 0.5), startTime);
      modGain.gain.setValueAtTime(freq * 0.8, startTime); // FM index
      modGain.gain.exponentialRampToValueAtTime(freq * 0.05, startTime + 0.3); // Decay FM for bell->sustain
      
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      // Carrier oscillator (slight detune for chorus-like richness)
      carrier.type = i % 2 === 0 ? 'sine' : 'triangle';
      const detune = (Math.random() - 0.5) * 6; // ±3 cents
      carrier.frequency.setValueAtTime(freq, startTime);
      carrier.detune.setValueAtTime(detune, startTime);

      // === FILTER ENVELOPE (Rhodes warmth) ===
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(1.5, startTime);
      // Quick attack to bright, slow decay to warm
      filter.frequency.setValueAtTime(300, startTime);
      filter.frequency.exponentialRampToValueAtTime(1400 + Math.random() * 400, startTime + 0.06);
      filter.frequency.exponentialRampToValueAtTime(700, startTime + duration * 0.6);

      // === AMPLITUDE ENVELOPE ===
      const voiceGain = ctx.createGain();
      const baseVol = 0.065 / chord.length;
      voiceGain.gain.setValueAtTime(0.0001, startTime);
      voiceGain.gain.exponentialRampToValueAtTime(baseVol, startTime + 0.08);
      voiceGain.gain.setValueAtTime(baseVol * 0.85, startTime + duration - 0.4);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      // === STEREO PANNING (spread voices) ===
      const panner = ctx.createStereoPanner();
      const panSpread = chord.length > 1 ? ((i / (chord.length - 1)) - 0.5) * 1.4 : 0;
      const panJitter = (Math.random() - 0.5) * 0.15;
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panSpread + panJitter)), startTime);

      // === ROUTING ===
      carrier.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(panner);
      
      // Send to chorus and reverb
      panner.connect(this.chorusDelayL!);
      panner.connect(this.chorusDelayR!);
      panner.connect(this.reverbInput!);

      // Start/stop oscillators
      modulator.start(startTime);
      carrier.start(startTime);
      carrier.stop(startTime + duration + 0.1);
      modulator.stop(startTime + duration + 0.1);

      this.oscillators.push(carrier, modulator);
    });
  }

  // Improved bass with octave doubling and optional slide
  private playBass(freq: number, startTime: number, duration: number, slideFrom?: number) {
    if (!this.audioContext || !this.reverbInput) return;

    const ctx = this.audioContext;
    
    // === MAIN BASS (fundamental) ===
    const bassOsc = ctx.createOscillator();
    bassOsc.type = 'triangle';
    
    const bassFreq = freq / 2; // One octave down
    if (slideFrom) {
      bassOsc.frequency.setValueAtTime(slideFrom / 2, startTime);
      bassOsc.frequency.exponentialRampToValueAtTime(bassFreq, startTime + 0.08);
    } else {
      bassOsc.frequency.setValueAtTime(bassFreq, startTime);
    }

    // === OCTAVE DOUBLE (adds clarity) ===
    const octaveOsc = ctx.createOscillator();
    octaveOsc.type = 'sine';
    octaveOsc.frequency.setValueAtTime(freq, startTime);
    if (slideFrom) {
      octaveOsc.frequency.setValueAtTime(slideFrom, startTime);
      octaveOsc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.08);
    }

    // === FILTER (warmth) ===
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, startTime);
    filter.frequency.exponentialRampToValueAtTime(350, startTime + 0.15);
    filter.Q.setValueAtTime(1, startTime);

    // === PLUCKY ENVELOPE (short attack) ===
    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0.0001, startTime);
    bassGain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.015);
    bassGain.gain.exponentialRampToValueAtTime(0.1, startTime + 0.12);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    const octaveGain = ctx.createGain();
    octaveGain.gain.setValueAtTime(0.0001, startTime);
    octaveGain.gain.exponentialRampToValueAtTime(0.06, startTime + 0.02);
    octaveGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

    // === ROUTING ===
    bassOsc.connect(filter);
    filter.connect(bassGain);
    octaveOsc.connect(octaveGain);
    
    // Merge bass voices
    const bassMerge = ctx.createGain();
    bassGain.connect(bassMerge);
    octaveGain.connect(bassMerge);
    
    // Less reverb on bass
    const bassReverbSend = ctx.createGain();
    bassReverbSend.gain.setValueAtTime(0.15, startTime);
    bassMerge.connect(bassReverbSend);
    bassReverbSend.connect(this.reverbInput!);
    
    // Direct to compressor for punch
    bassMerge.connect(this.compressor!);

    bassOsc.start(startTime);
    bassOsc.stop(startTime + duration + 0.1);
    octaveOsc.start(startTime);
    octaveOsc.stop(startTime + duration + 0.1);

    this.oscillators.push(bassOsc, octaveOsc);
  }

  private playBrushHit(startTime: number, isAccent: boolean) {
    if (!this.audioContext || !this.reverbInput) return;

    const ctx = this.audioContext;
    
    // White noise for brush sound
    const bufferSize = Math.floor(ctx.sampleRate * 0.12);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Shaped noise (pink-ish)
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.6;
    }
    
    const noise = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    noise.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isAccent ? 4500 : 2800, startTime);
    filter.Q.setValueAtTime(0.7, startTime);
    
    noise.connect(filter);
    filter.connect(gain);
    
    // Stereo positioning for drums
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(isAccent ? 0 : (Math.random() - 0.5) * 0.4, startTime);
    gain.connect(panner);
    panner.connect(this.reverbInput!);
    
    const vol = isAccent ? 0.035 : 0.018;
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);
    
    noise.start(startTime);
    noise.stop(startTime + 0.12);
  }

  // Rim click for subtle comping
  private playRimClick(startTime: number) {
    if (!this.audioContext || !this.reverbInput) return;

    const ctx = this.audioContext;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800, startTime);
    osc.frequency.exponentialRampToValueAtTime(400, startTime + 0.02);
    
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(600, startTime);
    
    osc.connect(filter);
    filter.connect(gain);
    
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(0.3, startTime);
    gain.connect(panner);
    panner.connect(this.reverbInput!);
    
    gain.gain.setValueAtTime(0.025, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);
    
    osc.start(startTime);
    osc.stop(startTime + 0.05);
  }

  private playHiHat(startTime: number, isOpen: boolean = false) {
    if (!this.audioContext || !this.reverbInput) return;

    const ctx = this.audioContext;
    
    // Multiple detuned oscillators for metallic sound
    const freqs = [4200, 5800, 7400];
    freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, startTime);
      
      osc.connect(filter);
      filter.connect(gain);
      
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(-0.25, startTime);
      gain.connect(panner);
      panner.connect(this.reverbInput!);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq + Math.random() * 200, startTime);
      
      const duration = isOpen ? 0.12 : 0.045;
      gain.gain.setValueAtTime(0.012, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    });
  }

  private scheduleNotes() {
    if (!this.isPlaying || !this.audioContext) return;

    const ctx = this.audioContext;
    const lookAhead = 0.12; // Schedule 120ms ahead
    const scheduleInterval = 40; // Check every 40ms

    while (this.nextBeatTime < ctx.currentTime + lookAhead) {
      const beatDuration = 0.48; // ~125 BPM swing feel
      const isOffbeat = this.beatCount % 2 === 1;
      
      // === SWING TIMING (humanization) ===
      const swing = isOffbeat ? this.swingAmount : 0;
      const microTiming = (Math.random() - 0.5) * 0.012; // ±6ms humanization
      const scheduledTime = this.nextBeatTime + swing + microTiming;

      const chord = JAZZ_CHORDS[this.chordIndex % JAZZ_CHORDS.length];
      const bassData = BASS_NOTES[this.chordIndex % BASS_NOTES.length];
      
      // === CHORD VOICINGS (on beats 1 and 3, occasional offbeat comping) ===
      if (this.beatCount % 2 === 0) {
        this.playChord(chord, scheduledTime, beatDuration * 3.2);
      } else if (this.beatCount % 8 === 5 && Math.random() > 0.5) {
        // Occasional offbeat comp chord
        const compChord = chord.slice(1, 4); // partial voicing
        this.playChord(compChord, scheduledTime + 0.02, beatDuration * 1.5);
      }
      
      // === WALKING BASS (with passing tones on upbeats) ===
      const usePassingTone = isOffbeat && Math.random() > 0.6;
      const bassFreq = usePassingTone ? bassData.passing : bassData.root;
      const slideFrom = isOffbeat && this.beatCount % 4 === 3 ? bassData.passing : undefined;
      this.playBass(bassFreq, scheduledTime, beatDuration * 0.85, slideFrom);
      
      // === BRUSH DRUMS (swing pattern) ===
      const isDownbeat = this.beatCount % 4 === 0;
      this.playBrushHit(scheduledTime, isDownbeat);
      
      // === HI-HAT on swung offbeats ===
      if (isOffbeat) {
        this.playHiHat(scheduledTime + beatDuration * 0.15, this.beatCount % 8 === 7);
      }
      
      // === RIM CLICK (sparse comping) ===
      if (this.beatCount % 8 === 2 && Math.random() > 0.4) {
        this.playRimClick(scheduledTime + beatDuration * 0.5);
      }
      
      this.nextBeatTime += beatDuration;
      this.beatCount++;
      
      // Advance chord on beat 1 of each bar (every 4 beats)
      if (this.beatCount % 4 === 0) {
        this.chordIndex++;
      }
      
      // Reset progression after 36 bars for variation
      if (this.chordIndex >= JAZZ_CHORDS.length * 4) {
        this.chordIndex = 0;
      }
    }

    this.schedulerTimer = window.setTimeout(() => this.scheduleNotes(), scheduleInterval);
  }

  start() {
    if (this.isPlaying) return;
    
    const enabled = localStorage.getItem(MUSIC_ENABLED_KEY);
    if (enabled === 'false') return;

    try {
      const ctx = this.initContext();
      this.isPlaying = true;
      this.nextBeatTime = ctx.currentTime + 0.15;
      this.chordIndex = 0;
      this.beatCount = 0;
      this.scheduleNotes();
    } catch (e) {
      console.debug('Casino jazz playback failed:', e);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    // Stop chorus LFO
    if (this.chorusLFO) {
      try { this.chorusLFO.stop(); } catch { /* already stopped */ }
      this.chorusLFO = null;
    }
    // Stop all oscillators
    this.oscillators.forEach(osc => {
      try { osc.stop(); } catch { /* already stopped */ }
    });
    this.oscillators = [];
    // Reset audio nodes for clean restart
    this.audioContext = null;
    this.masterGain = null;
    this.compressor = null;
    this.reverbInput = null;
    this.reverbOutput = null;
    this.chorusDelayL = null;
    this.chorusDelayR = null;
  }

  toggle(): boolean {
    const current = localStorage.getItem(MUSIC_ENABLED_KEY);
    const newValue = current === 'false' ? 'true' : 'false';
    localStorage.setItem(MUSIC_ENABLED_KEY, newValue);
    
    if (newValue === 'true') {
      this.start();
    } else {
      this.stop();
    }
    
    return newValue === 'true';
  }

  isEnabled(): boolean {
    const stored = localStorage.getItem(MUSIC_ENABLED_KEY);
    return stored === null ? true : stored === 'true';
  }

  setVolume(volume: number) {
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(
        Math.max(0, Math.min(1, volume)) * MUSIC_VOLUME,
        this.audioContext.currentTime
      );
    }
  }
}

// Singleton instance
let casinoJazzPlayer: CasinoJazzPlayer | null = null;

export function getCasinoJazz(): CasinoJazzPlayer {
  if (!casinoJazzPlayer) {
    casinoJazzPlayer = new CasinoJazzPlayer();
  }
  return casinoJazzPlayer;
}

// React hook for casino jazz
export function useCasinoJazz() {
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<CasinoJazzPlayer | null>(null);

  useEffect(() => {
    playerRef.current = getCasinoJazz();
    setIsPlaying(playerRef.current.isEnabled());
    
    // Auto-start on mount if enabled
    if (playerRef.current.isEnabled()) {
      // Delay start to allow user interaction first
      const handleInteraction = () => {
        if (playerRef.current?.isEnabled()) {
          playerRef.current.start();
          setIsPlaying(true);
        }
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
      };
      document.addEventListener('click', handleInteraction);
      document.addEventListener('keydown', handleInteraction);
      
      return () => {
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
      };
    }
  }, []);

  const toggle = useCallback(() => {
    if (playerRef.current) {
      const newState = playerRef.current.toggle();
      setIsPlaying(newState);
      return newState;
    }
    return false;
  }, []);

  const start = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.start();
      setIsPlaying(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
  }, []);

  return { isPlaying, toggle, start, stop };
}

// Export a singleton for use outside React components
let globalAudioContext: AudioContext | null = null;

export function playSoundGlobal(type: SoundType) {
  const enabled = localStorage.getItem(SOUND_ENABLED_KEY);
  if (enabled === 'false') return;

  try {
    if (!globalAudioContext) {
      globalAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume();
    }

    const config = SOUND_CONFIGS[type];
    const now = globalAudioContext.currentTime;
    const gainNode = globalAudioContext.createGain();
    gainNode.connect(globalAudioContext.destination);
    gainNode.gain.setValueAtTime(config.gain, now);

    const notes = config.notes || [config.frequency];
    const noteDelay = config.notes ? 0.05 : 0;

    notes.forEach((freq, index) => {
      const startTime = now + index * noteDelay;
      const osc = globalAudioContext!.createOscillator();
      const noteGain = globalAudioContext!.createGain();
      
      osc.connect(noteGain);
      noteGain.connect(gainNode);
      osc.type = config.type;
      osc.frequency.setValueAtTime(freq, startTime);
      noteGain.gain.setValueAtTime(config.gain / notes.length, startTime);
      
      if (config.ramp === 'down') {
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + config.duration);
      }
      
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + config.duration);
      osc.start(startTime);
      osc.stop(startTime + config.duration + 0.01);
    });
  } catch (e) {
    console.debug('Global sound playback failed:', e);
  }
}
