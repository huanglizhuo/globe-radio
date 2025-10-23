import { useRef, useCallback, useEffect } from 'react';

interface TuningEffectOptions {
  volume?: number; // Effect volume (0-1)
  preset?: 'classic' | 'am-rough' | 'fast-digital' | 'vintage-shortwave' | 'slow-analog' | 'random';
}

// Tuning effect presets with different characteristics
interface TuningPreset {
  name: string;
  sweepDuration: number;
  sweepStartFreq: number;
  sweepEndFreq: number;
  sweepType: OscillatorType;
  sweepVolume: number;
  noiseVolume: number;
  crackleVolume: number;
  crackleFilterFreq: number;
}

const TUNING_PRESETS: Record<string, TuningPreset> = {
  'classic': {
    name: 'Classic FM Sweep',
    sweepDuration: 2.5,
    sweepStartFreq: 500,
    sweepEndFreq: 5000,
    sweepType: 'sine',
    sweepVolume: 0.3,
    noiseVolume: 0.6,
    crackleVolume: 0.2,
    crackleFilterFreq: 800,
  },
  'am-rough': {
    name: 'AM Rough Scan',
    sweepDuration: 3.0,
    sweepStartFreq: 300,
    sweepEndFreq: 3000,
    sweepType: 'square',
    sweepVolume: 0.25,
    noiseVolume: 0.75,
    crackleVolume: 0.35,
    crackleFilterFreq: 600,
  },
  'fast-digital': {
    name: 'Fast Digital Scan',
    sweepDuration: 1.5,
    sweepStartFreq: 800,
    sweepEndFreq: 8000,
    sweepType: 'sawtooth',
    sweepVolume: 0.4,
    noiseVolume: 0.5,
    crackleVolume: 0.15,
    crackleFilterFreq: 1200,
  },
  'vintage-shortwave': {
    name: 'Vintage Shortwave',
    sweepDuration: 3.5,
    sweepStartFreq: 400,
    sweepEndFreq: 4500,
    sweepType: 'triangle',
    sweepVolume: 0.28,
    noiseVolume: 0.7,
    crackleVolume: 0.4,
    crackleFilterFreq: 500,
  },
  'slow-analog': {
    name: 'Slow Analog Tuning',
    sweepDuration: 4.0,
    sweepStartFreq: 350,
    sweepEndFreq: 4000,
    sweepType: 'sine',
    sweepVolume: 0.35,
    noiseVolume: 0.55,
    crackleVolume: 0.25,
    crackleFilterFreq: 700,
  },
};

export function useRadioTuningEffect() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentEffectRef = useRef<{
    oscillator: OscillatorNode;
    noiseSource: AudioBufferSourceNode;
    crackleSource: AudioBufferSourceNode;
    masterGain: GainNode;
    noiseGain: GainNode;
    sweepGain: GainNode;
    crackleGain: GainNode;
    crackleFilter: BiquadFilterNode;
  } | null>(null);
  const isPlayingRef = useRef(false);
  const fadeOutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPresetRef = useRef<string>('classic');

  // Initialize AudioContext
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (fadeOutTimeoutRef.current) {
        clearTimeout(fadeOutTimeoutRef.current);
      }
      if (currentEffectRef.current) {
        try {
          currentEffectRef.current.oscillator.stop();
          currentEffectRef.current.noiseSource.stop();
          currentEffectRef.current.crackleSource.stop();
        } catch (e) {
          // Ignore errors during cleanup
        }
        currentEffectRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Generate looping white noise buffer
  const createLoopingNoiseBuffer = useCallback((context: AudioContext, duration: number): AudioBuffer => {
    const sampleRate = context.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = context.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Fill with random noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // Random values between -1 and 1
    }

    return buffer;
  }, []);

  // Get random preset
  const getRandomPreset = useCallback((): TuningPreset => {
    const presetKeys = Object.keys(TUNING_PRESETS);
    const randomKey = presetKeys[Math.floor(Math.random() * presetKeys.length)];
    return TUNING_PRESETS[randomKey];
  }, []);

  // Start continuous tuning effect
  const startTuningEffect = useCallback((options: TuningEffectOptions = {}): void => {
    const {
      volume = 0.4, // 40% volume (moderate intensity)
      preset = 'random',
    } = options;

    // Stop any currently playing effect
    if (isPlayingRef.current) {
      console.log('⏹️ Stopping previous tuning effect before starting new one');
      stopTuningEffect();
    }

    // Select preset
    const selectedPreset = preset === 'random'
      ? getRandomPreset()
      : TUNING_PRESETS[preset] || TUNING_PRESETS.classic;

    currentPresetRef.current = selectedPreset.name;
    console.log(`📻 Starting tuning effect: ${selectedPreset.name}`);

    // Create or get AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const context = audioContextRef.current;
    const currentTime = context.currentTime;

    try {
      // === Create Sweep Oscillator (the tuning sound) ===
      const sweepOsc = context.createOscillator();
      sweepOsc.type = selectedPreset.sweepType;
      sweepOsc.frequency.setValueAtTime(selectedPreset.sweepStartFreq, currentTime);

      // Schedule repeating sweeps
      for (let i = 0; i < 100; i++) { // Schedule 100 cycles
        const cycleStartTime = currentTime + (i * selectedPreset.sweepDuration);
        sweepOsc.frequency.setValueAtTime(selectedPreset.sweepStartFreq, cycleStartTime);
        sweepOsc.frequency.exponentialRampToValueAtTime(
          selectedPreset.sweepEndFreq,
          cycleStartTime + selectedPreset.sweepDuration * 0.8
        );
        // Quick drop back to start frequency
        sweepOsc.frequency.exponentialRampToValueAtTime(
          selectedPreset.sweepStartFreq,
          cycleStartTime + selectedPreset.sweepDuration
        );
      }

      // Sweep gain envelope with fade-in
      const sweepGain = context.createGain();
      sweepGain.gain.setValueAtTime(0, currentTime);
      sweepGain.gain.linearRampToValueAtTime(
        volume * selectedPreset.sweepVolume,
        currentTime + 0.1
      ); // Quick fade in

      // === Create White Noise (static/interference) ===
      const noiseBuffer = createLoopingNoiseBuffer(context, 2); // 2 second looping buffer
      const noiseSource = context.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true; // Loop the noise

      // Noise gain envelope with fade-in
      const noiseGain = context.createGain();
      noiseGain.gain.setValueAtTime(0, currentTime);
      noiseGain.gain.linearRampToValueAtTime(
        volume * selectedPreset.noiseVolume,
        currentTime + 0.15
      ); // Fade in

      // === Add a bit of crackle (filtered noise pulse) ===
      const crackleBuffer = createLoopingNoiseBuffer(context, 1.5); // 1.5 second looping buffer
      const crackleSource = context.createBufferSource();
      crackleSource.buffer = crackleBuffer;
      crackleSource.loop = true; // Loop the crackle

      // Low-pass filter for crackle (makes it sound more like radio interference)
      const crackleFilter = context.createBiquadFilter();
      crackleFilter.type = 'lowpass';
      crackleFilter.frequency.setValueAtTime(selectedPreset.crackleFilterFreq, currentTime);
      crackleFilter.Q.setValueAtTime(0.5, currentTime);

      // Crackle gain with fade-in
      const crackleGain = context.createGain();
      crackleGain.gain.setValueAtTime(0, currentTime);
      crackleGain.gain.linearRampToValueAtTime(
        volume * selectedPreset.crackleVolume,
        currentTime + 0.1
      );

      // === Master gain for overall effect ===
      const masterGain = context.createGain();
      masterGain.gain.setValueAtTime(1, currentTime);

      // === Connect the audio graph ===
      sweepOsc.connect(sweepGain);
      sweepGain.connect(masterGain);

      noiseSource.connect(noiseGain);
      noiseGain.connect(masterGain);

      crackleSource.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(masterGain);

      masterGain.connect(context.destination);

      // === Start all sources ===
      sweepOsc.start(currentTime);
      noiseSource.start(currentTime);
      crackleSource.start(currentTime);

      // Store references for cleanup
      currentEffectRef.current = {
        oscillator: sweepOsc,
        noiseSource: noiseSource,
        crackleSource: crackleSource,
        masterGain: masterGain,
        noiseGain: noiseGain,
        sweepGain: sweepGain,
        crackleGain: crackleGain,
        crackleFilter: crackleFilter,
      };

      isPlayingRef.current = true;
    } catch (error) {
      console.error('Error starting tuning effect:', error);
      isPlayingRef.current = false;
      throw error;
    }
  }, [createLoopingNoiseBuffer, getRandomPreset]);

  // Stop tuning effect with fade-out
  const stopTuningEffect = useCallback((fadeOutDuration: number = 0.3): Promise<void> => {
    return new Promise((resolve) => {
      if (!isPlayingRef.current || !currentEffectRef.current) {
        resolve();
        return;
      }

      const context = audioContextRef.current;
      if (!context) {
        resolve();
        return;
      }

      const currentTime = context.currentTime;
      const effect = currentEffectRef.current;

      try {
        console.log(`🔇 Fading out tuning effect: ${currentPresetRef.current}`);

        // Fade out all gain nodes
        effect.sweepGain.gain.cancelScheduledValues(currentTime);
        effect.sweepGain.gain.setValueAtTime(effect.sweepGain.gain.value, currentTime);
        effect.sweepGain.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration);

        effect.noiseGain.gain.cancelScheduledValues(currentTime);
        effect.noiseGain.gain.setValueAtTime(effect.noiseGain.gain.value, currentTime);
        effect.noiseGain.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration);

        effect.crackleGain.gain.cancelScheduledValues(currentTime);
        effect.crackleGain.gain.setValueAtTime(effect.crackleGain.gain.value, currentTime);
        effect.crackleGain.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration);

        // Stop all sources after fade out
        if (fadeOutTimeoutRef.current) {
          clearTimeout(fadeOutTimeoutRef.current);
        }

        fadeOutTimeoutRef.current = setTimeout(() => {
          try {
            if (currentEffectRef.current) {
              currentEffectRef.current.oscillator.stop();
              currentEffectRef.current.noiseSource.stop();
              currentEffectRef.current.crackleSource.stop();

              // Disconnect all nodes
              currentEffectRef.current.masterGain.disconnect();
              currentEffectRef.current = null;
            }
          } catch (e) {
            // Ignore errors during cleanup
          }
          isPlayingRef.current = false;
          console.log('✅ Tuning effect stopped');
          resolve();
        }, fadeOutDuration * 1000 + 100); // Add 100ms buffer
      } catch (error) {
        console.error('Error stopping tuning effect:', error);
        currentEffectRef.current = null;
        isPlayingRef.current = false;
        resolve();
      }
    });
  }, []);

  // Check if tuning effect is currently playing
  const isTuning = useCallback(() => {
    return isPlayingRef.current;
  }, []);

  return {
    startTuningEffect,
    stopTuningEffect,
    isTuning,
  };
}
