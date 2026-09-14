import { useState, useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';
import type { RadioStation } from '../types';
import { RadioBrowserAPI } from '../services/radioBrowserAPI';
import { useRadioTuningEffect } from './useRadioTuningEffect';

// Web Audio graph for realtime frequency levels. Bound to a single audio
// element: createMediaElementSource() can only be called once per element and
// permanently routes that element's output through the context.
interface AnalyserEntry {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
  element: HTMLAudioElement;
}

export function useAudioPlayer(stations: RadioStation[], tuningEffectEnabled: boolean = true) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [validatingStream, setValidatingStream] = useState(false);
  // Signal strength for the current station (mapping documented at the
  // derivation effect below)
  const [signal, setSignal] = useState<'strong' | 'weak' | 'none'>('none');
  // True when the realtime-levels analyser is active for the current element+station
  const [hasRealtimeLevels, setHasRealtimeLevels] = useState(false);
  // Sleep timer: configured minutes (null = off) and live countdown seconds
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shouldAutoSkipRef = useRef(false);
  const maxAutoSkipAttemptsRef = useRef(0);
  const prevStationRef = useRef<RadioStation | null>(null);
  const validationCacheRef = useRef<Map<string, boolean>>(new Map()); // Cache validation results
  const isValidatingRef = useRef(false); // Prevent concurrent validations
  const isTuningRef = useRef(false); // Track if tuning effect is playing
  const autoSkipPendingRef = useRef(false); // Track if auto-skip is already pending
  // Uuid the user explicitly chose (deep link / map click / preset recall).
  // The auto-tune validation must not override an explicit selection.
  const explicitSelectionRef = useRef<string | null>(null);

  // Realtime levels (Web Audio analyser) - see getLevels below
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserEntry | null>(null);
  const analyserActiveRef = useRef(false); // Analyser applies to the current station
  const corsProbeActiveRef = useRef(false); // crossOrigin='anonymous' probe in flight
  const corsFailedStationsRef = useRef<Set<string>>(new Set()); // Stations that failed the CORS probe
  const currentStationRef = useRef<RadioStation | null>(null); // Latest station for element handlers
  const volumeRef = useRef(volume); // Latest volume state (avoids stale closures)
  // Sleep timer internals
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepRampIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepRemainingRef = useRef<number | null>(null);
  const sleepFiredRef = useRef(false); // Guard against double-firing the timer

  // Latest copies of the core callbacks for long-lived registrations (Media
  // Session action handlers, CORS-probe recovery) so they never fire stale
  // closures. Refreshed on every render by the effect next to `previous`.
  const latestRef = useRef<{
    play: () => Promise<void>;
    pause: () => void;
    next: () => Promise<void>;
    previous: () => Promise<void>;
    recreateAudioElement: () => HTMLAudioElement;
  }>({
    play: async () => {},
    pause: () => {},
    next: async () => {},
    previous: async () => {},
    recreateAudioElement: () => {
      throw new Error('useAudioPlayer: audio element not initialized');
    },
  });

  const currentStation = stations[currentIndex] || null;

  // Radio tuning effect
  const { startTuningEffect, stopTuningEffect, isTuning } = useRadioTuningEffect();

  // Fade in audio volume
  const fadeInVolume = useCallback((targetVolume: number, duration: number = 300) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const steps = 20; // Number of volume steps
    const stepDuration = duration / steps;
    const volumeIncrement = targetVolume / steps;

    audio.volume = 0; // Start from silent
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps || !audioRef.current) {
        clearInterval(fadeInterval);
        if (audioRef.current) {
          audioRef.current.volume = targetVolume;
        }
        return;
      }

      audioRef.current.volume = Math.min(volumeIncrement * currentStep, targetVolume);
    }, stepDuration);
  }, []);

  // Get (or lazily create) the shared AudioContext used for realtime levels.
  // Must be called within a user-gesture chain (e.g. from play()).
  const ensureAudioContext = useCallback((): AudioContext | null => {
    if (!audioCtxRef.current) {
      const win = window as Window & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext || win.webkitAudioContext;
      if (!Ctor) return null;
      audioCtxRef.current = new Ctor();
    }
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Tear down the analyser graph (bound to a single element). The shared
  // AudioContext stays alive for reuse by the next element.
  const disconnectAnalyser = useCallback(() => {
    const entry = analyserRef.current;
    analyserRef.current = null;
    analyserActiveRef.current = false;
    setHasRealtimeLevels(false);
    if (entry) {
      try { entry.source.disconnect(); } catch { /* ignore */ }
      try { entry.analyser.disconnect(); } catch { /* ignore */ }
    }
  }, []);

  // Attach (or reuse) the analyser graph for an element whose current stream
  // loaded successfully WITH crossOrigin='anonymous'. One MediaElementSource
  // per element lifetime - never call this for HLS or non-CORS loads, their
  // output through the graph would be silent.
  const attachAnalyserToElement = useCallback((audio: HTMLAudioElement) => {
    try {
      const ctx = ensureAudioContext();
      if (!ctx) return;
      if (!analyserRef.current || analyserRef.current.element !== audio) {
        disconnectAnalyser();
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyser.connect(ctx.destination); // unity-gain passthrough
        analyserRef.current = { ctx, source, analyser, element: audio };
      }
      analyserActiveRef.current = true;
      setHasRealtimeLevels(true);
    } catch (err) {
      // Realtime levels are a bonus feature - never let them break playback.
      console.warn('Failed to attach realtime levels analyser:', err);
      disconnectAnalyser();
    }
  }, [ensureAudioContext, disconnectAnalyser]);

  // Wire all event handlers on an audio element. Shared by the initial-creation
  // effect and recreateAudioElement() (CORS-failure recovery) so every element
  // behaves identically.
  const attachAudioHandlers = useCallback((audio: HTMLAudioElement) => {
    // Error handling
    audio.onerror = () => {
      // Realtime-levels CORS recovery: this load attempted
      // crossOrigin='anonymous' (analyser probe) and failed with a network/src
      // error before canplay. Retry once on a fresh element WITHOUT
      // crossOrigin, and cache the failure per stationuuid so this station is
      // never probed (or retried) again - the cache prevents any retry loop.
      if (corsProbeActiveRef.current && audio === audioRef.current) {
        corsProbeActiveRef.current = false;
        const code = audio.error?.code;
        const probeFailed =
          code === MediaError.MEDIA_ERR_NETWORK ||
          code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;
        const station = currentStationRef.current;
        if (probeFailed && station) {
          corsFailedStationsRef.current.add(station.stationuuid);
          console.warn(`Realtime levels unavailable for "${station.name}" (CORS) - retrying without crossOrigin`);
          latestRef.current.recreateAudioElement();
          setLoading(false);
          void latestRef.current.play();
          return; // Skip normal error handling for this attempt
        }
      }

      const error = audio.error;
      let errorMessage = 'Failed to load station';
      let isCorsError = false;

      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = 'Playback aborted';
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error - check your connection';
            // Network errors often indicate CORS issues
            isCorsError = true;
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = 'Audio format not supported';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Stream not available';
            isCorsError = true; // Often a CORS issue
            break;
        }
      }

      console.error('Audio error:', errorMessage, error);

      if (isCorsError) {
        console.log(`⚠️ Stream error for "${currentStation?.name}" - triggering auto-skip...`);
        // Don't show error in UI since validation already filtered bad streams
        // Just auto-skip to next station
        shouldAutoSkipRef.current = true;
      } else {
        // Only log to console, don't show error in UI
        console.log('Playback error:', errorMessage);
      }

      setLoading(false);
      setIsPlaying(false);
    };

    // Loading events
    audio.onloadstart = () => {
      setLoading(true);
      setError(null);
    };

    audio.oncanplay = async () => {
      setLoading(false);

      // The CORS probe succeeded (stream loaded with crossOrigin='anonymous'):
      // it is now safe to route this element through Web Audio for levels.
      if (corsProbeActiveRef.current) {
        corsProbeActiveRef.current = false;
        attachAnalyserToElement(audio);
      }

      // Stop tuning effect when station is ready to play (only if enabled)
      if (tuningEffectEnabled && isTuning()) {
        console.log('📻 Station ready, stopping tuning effect...');
        await stopTuningEffect(0.3);

        // Fade in the station audio
        console.log('🎵 Fading in station audio...');
        fadeInVolume(volume, 300);
      } else if (!tuningEffectEnabled) {
        // If tuning effect is disabled, just set normal volume
        audio.volume = volume;
      }
    };

    audio.onplay = () => {
      setIsPlaying(true);
      setLoading(false);
      setError(null);
      // Reset auto-skip counter on successful play
      maxAutoSkipAttemptsRef.current = 0;

      // Media Session: update lock-screen / OS metadata when playback starts
      if ('mediaSession' in navigator && currentStationRef.current) {
        const station = currentStationRef.current;
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: station.name,
            artist: station.country || 'Unknown country',
            album: 'Globe Radio',
            artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
          });
        } catch {
          // MediaMetadata not available in this browser
        }
      }
    };

    audio.onpause = () => {
      setIsPlaying(false);
    };

    audio.onwaiting = () => {
      setLoading(true);
      setSignal('weak');
    };

    audio.onplaying = () => {
      setLoading(false);
      setError(null);
      setSignal('strong');
      // The element's output is routed through this AudioContext while the
      // analyser is attached; a suspended context would mean silence.
      const entry = analyserRef.current;
      if (entry && entry.element === audio && entry.ctx.state === 'suspended') {
        void entry.ctx.resume().catch(() => {});
      }
    };

    // The media clock is advancing -> strong signal. Fires several times per
    // second while playing; setting the same value is a React no-op.
    audio.ontimeupdate = () => {
      if (!audio.paused) {
        setSignal('strong');
      }
    };

    // Handle stalled streams
    audio.onstalled = () => {
      console.warn('Stream stalled, attempting to recover...');
      setLoading(true);
      setSignal('weak');
    };
  }, [isTuning, stopTuningEffect, fadeInVolume, volume, attachAnalyserToElement]);

  // Replace the current audio element with a fresh one. Used when a
  // Web-Audio-routed element must load a non-CORS stream: the routing cannot be
  // undone per element, and a non-CORS resource through a MediaElementSource
  // is silent, so the only safe recovery is a clean element.
  const recreateAudioElement = useCallback((): HTMLAudioElement => {
    const old = audioRef.current;
    disconnectAnalyser();
    if (old) {
      // Silence the discarded element's handlers so its teardown events
      // (pause/emptied/error triggered by clearing src) cannot affect state.
      old.onerror = null;
      old.onloadstart = null;
      old.oncanplay = null;
      old.onplay = null;
      old.onpause = null;
      old.onwaiting = null;
      old.onplaying = null;
      old.ontimeupdate = null;
      old.onstalled = null;
      try {
        old.pause();
        old.src = '';
      } catch {
        // Ignore errors during cleanup
      }
    }
    const audio = new Audio();
    audio.volume = volume;
    audio.preload = 'none'; // Don't preload to save bandwidth
    // Don't set crossOrigin by default - will be set per stream if needed
    attachAudioHandlers(audio);
    audioRef.current = audio;
    return audio;
  }, [attachAudioHandlers, disconnectAnalyser, volume]);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.preload = 'none'; // Don't preload to save bandwidth
    // Don't set crossOrigin by default - will be set per stream if needed

    attachAudioHandlers(audio);

    // Fresh element: drop any analyser graph bound to a previous element and
    // invalidate any in-flight CORS probe.
    disconnectAnalyser();
    corsProbeActiveRef.current = false;

    // Media Session: OS / lock-screen media controls. Registered once per
    // element lifetime; the handlers read the latest callbacks via latestRef
    // so they never fire stale closures.
    if ('mediaSession' in navigator) {
      const ms = navigator.mediaSession;
      const safeSetHandler = (action: MediaSessionAction, handler: (() => void) | null) => {
        try {
          ms.setActionHandler(action, handler);
        } catch {
          // Action not supported in this browser
        }
      };
      safeSetHandler('play', () => { void latestRef.current.play(); });
      safeSetHandler('pause', () => { latestRef.current.pause(); });
      safeSetHandler('previoustrack', () => { void latestRef.current.previous(); });
      safeSetHandler('nexttrack', () => { void latestRef.current.next(); });
    }

    audioRef.current = audio;

    return () => {
      // Cleanup HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // Cleanup audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      // Clean up Media Session handlers
      if ('mediaSession' in navigator) {
        const actions: MediaSessionAction[] = ['play', 'pause', 'previoustrack', 'nexttrack'];
        for (const action of actions) {
          try {
            navigator.mediaSession.setActionHandler(action, null);
          } catch {
            // Ignore
          }
        }
      }
    };
  }, [isTuning, stopTuningEffect, fadeInVolume, volume, attachAudioHandlers, disconnectAnalyser]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    volumeRef.current = volume;
  }, [volume]);

  // Mirror the current station for handlers wired long-lived onto the audio
  // element (media session metadata, CORS failure cache)
  useEffect(() => {
    currentStationRef.current = currentStation;
  }, [currentStation]);

  // Reflect play state to OS media controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Signal strength mapping:
  // - 'strong': playing and the audio clock is advancing (set by the
  //   'playing'/'timeupdate' handlers above)
  // - 'weak':   loading or validating a stream ('waiting'/'stalled' also map
  //   here since they set loading)
  // - 'none':   no station selected, or paused and not loading/validating
  useEffect(() => {
    if (!currentStation) {
      setSignal('none');
    } else if (loading || validatingStream) {
      setSignal('weak');
    } else if (!isPlaying) {
      setSignal('none');
    }
    // Playing and not loading: keep the event-driven value ('strong')
  }, [currentStation, loading, validatingStream, isPlaying]);

  // Validate stream before displaying station
  const validateStream = useCallback(async (station: RadioStation): Promise<boolean> => {
    try {
      // Check cache first
      const cached = validationCacheRef.current.get(station.stationuuid);
      if (cached !== undefined) {
        // Only log cached results occasionally to reduce console spam
        if (Math.random() < 0.05) { // Log ~5% of cache hits
          console.log(`📦 [${station.name}] Using cached validation result: ${cached ? 'valid' : 'invalid'}`);
        }
        return cached;
      }

      let streamUrl = station.url_resolved || station.url;

      if (!streamUrl || streamUrl.trim() === '') {
        console.log(`❌ [${station.name}] No stream URL - skipping`);
        validationCacheRef.current.set(station.stationuuid, false);
        return false;
      }

      console.log(`🔍 Validating stream for: ${station.name}`);

      // Create a temporary audio element for testing
      const testAudio = new Audio();
      testAudio.preload = 'metadata';
      testAudio.volume = 0; // Mute during validation

      const isHLS = streamUrl.includes('.m3u8') || streamUrl.includes('m3u8');

      return new Promise((resolve) => {
        let testHls: Hls | null = null;
        let cleanedUp = false;
        let resolved = false;

        // Safe resolve - only resolves once
        const safeResolve = (result: boolean) => {
          if (resolved) return;
          resolved = true;
          validationCacheRef.current.set(station.stationuuid, result);
          resolve(result);
        };

        const cleanup = () => {
          if (cleanedUp) return;
          cleanedUp = true;

          clearTimeout(timeout);

          // Remove event handlers to prevent them from firing after cleanup
          testAudio.oncanplay = null;
          testAudio.onerror = null;

          // Cleanup audio element
          try {
            testAudio.pause();
            testAudio.src = '';
          } catch (e) {
            // Ignore errors during cleanup
          }

          // Cleanup HLS instance
          if (testHls) {
            try {
              testHls.destroy();
            } catch (e) {
              // Ignore errors during cleanup
            }
            testHls = null;
          }
        };

        const timeout = setTimeout(() => {
          console.log(`⏱️ [${station.name}] Validation timeout - skipping`);
          cleanup();
          safeResolve(false);
        }, 5000); // 5 second timeout

        testAudio.oncanplay = () => {
          console.log(`✅ [${station.name}] Stream validated successfully`);
          cleanup();
          safeResolve(true);
        };

        testAudio.onerror = () => {
          // Only log every few validation failures to reduce console spam
          if (Math.random() < 0.1) { // Log ~10% of failures
            console.log(`❌ [${station.name}] Stream validation failed:`, testAudio.error?.code);
          }
          cleanup();
          safeResolve(false);
        };

        // Test the stream
        if (isHLS && Hls.isSupported()) {
          testHls = new Hls({
            enableWorker: true,
            xhrSetup: function(xhr) {
              xhr.withCredentials = false;
            },
          });

          testHls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log(`✅ [${station.name}] HLS manifest validated`);
            cleanup();
            safeResolve(true);
          });

          testHls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              // Only log every few HLS failures to reduce console spam
              if (Math.random() < 0.1) { // Log ~10% of failures
                console.log(`❌ [${station.name}] HLS validation failed:`, data.type);
              }
              cleanup();
              safeResolve(false);
            }
          });

          testHls.loadSource(streamUrl);
          testHls.attachMedia(testAudio);
        } else {
          testAudio.src = streamUrl;
          testAudio.load();
        }
      });
    } catch (err) {
      console.log(`❌ [${station.name}] Validation error:`, err);
      validationCacheRef.current.set(station.stationuuid, false);
      return false;
    }
  }, []);

  // Find next valid station
  const findValidStation = useCallback(async (startIndex: number): Promise<number | null> => {
    if (stations.length === 0) return null;

    // Prevent concurrent validations
    if (isValidatingRef.current) {
      console.log('⏸️ Validation already in progress, skipping');
      return null;
    }

    isValidatingRef.current = true;
    console.log(`🔍 findValidStation called with startIndex: ${startIndex}`);
    setValidatingStream(true);
    let attempts = 0;
    let currentIdx = startIndex;

    while (attempts < stations.length) {
      const station = stations[currentIdx];
      const isValid = await validateStream(station);

      if (isValid) {
        setValidatingStream(false);
        isValidatingRef.current = false;
        console.log(`✅ Found valid station at index ${currentIdx}: ${station.name}`);
        return currentIdx;
      }

      console.log(`⏭️ Skipping station: ${station.name}`);
      currentIdx = (currentIdx + 1) % stations.length;
      attempts++;
    }

    setValidatingStream(false);
    isValidatingRef.current = false;
    console.error('❌ No valid stations found after checking all stations');
    return null;
  }, [stations, validateStream]);

  // Play station
  const play = useCallback(async () => {
    if (!currentStation || !audioRef.current) return;

    try {
      setLoading(true);
      setError(null);

      // Per-attempt analyser state: realtime levels are only reported once the
      // current load's crossOrigin probe has succeeded (see oncanplay).
      corsProbeActiveRef.current = false;
      analyserActiveRef.current = false;
      setHasRealtimeLevels(false);

      let audio = audioRef.current;

      // Stop current playback first
      audio.pause();
      audio.currentTime = 0;

      // Start tuning effect ONLY if enabled and not already playing
      // (next/previous already start it immediately)
      if (tuningEffectEnabled && !isTuning()) {
        console.log(`📻 Starting tuning effect for "${currentStation.name}"...`);
        startTuningEffect({ volume: 0.4, preset: 'random' }); // Random preset for variety
      } else if (tuningEffectEnabled && isTuning()) {
        console.log(`📻 Tuning effect already playing, continuing for "${currentStation.name}"...`);
      } else if (!tuningEffectEnabled) {
        console.log(`🔇 Tuning effect disabled for "${currentStation.name}"`);
      }

      // Register click with API (fire and forget)
      RadioBrowserAPI.registerClick(currentStation.stationuuid);

      // Use url_resolved first, fallback to url
      let streamUrl = currentStation.url_resolved || currentStation.url;

      // If URL is empty or invalid, try to get it from API
      if (!streamUrl || streamUrl.trim() === '') {
        console.log('No stream URL, fetching from API...');
        const apiUrl = await RadioBrowserAPI.getStreamUrl(currentStation.stationuuid);
        if (apiUrl) {
          streamUrl = apiUrl;
        } else {
          throw new Error('No valid stream URL available');
        }
      }

      console.log('Playing station:', currentStation.name, 'URL:', streamUrl);

      // Cleanup previous HLS instance if exists
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Check if it's an HLS stream (m3u8)
      const isHLS = streamUrl.includes('.m3u8') || streamUrl.includes('m3u8');

      // HLS never gets the analyser (hls.js segment CORS varies). If this
      // element is routed through Web Audio from a previous direct-stream
      // probe, replace it first: Safari-native HLS and the HLS fallbacks load
      // non-CORS URLs directly, which would be silent through a
      // MediaElementSource.
      if (analyserRef.current?.element === audio) {
        audio = recreateAudioElement();
      }

      if (isHLS && Hls.isSupported()) {
        // Use HLS.js for m3u8 streams
        console.log('Using HLS.js for m3u8 stream');
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          xhrSetup: function(xhr) {
            // Try without credentials first to avoid CORS issues
            xhr.withCredentials = false;
          },
        });
        hlsRef.current = hls;

        // Helper function to fallback to regular audio playback
        const fallbackToRegularAudio = async () => {
          console.warn('⚠️ HLS failed, falling back to regular audio playback...');
          hls.destroy();
          hlsRef.current = null;

          // Clear any error message
          setError(null);

          // Try playing as regular audio stream
          try {
            audio.removeAttribute('crossOrigin');
            audio.src = streamUrl;
            audio.load();
            await new Promise(resolve => setTimeout(resolve, 100));
            await audio.play();
            console.log('✅ Fallback to regular audio successful');
          } catch (fallbackErr: any) {
            console.error('❌ Fallback to regular audio also failed:', fallbackErr);

            // Don't show error or auto-skip for browser autoplay policy errors
            if (fallbackErr.name === 'NotAllowedError') {
              console.log('Browser autoplay policy blocked playback - user interaction required');
              setIsPlaying(false);
              setLoading(false);
              // Don't set error message or auto-skip
              return;
            }

            // Only skip to next station for actual stream errors
            // Don't show error in UI since validation already filtered bad streams
            console.log('HLS fallback failed - auto-skipping to next station...');
            setIsPlaying(false);
            setLoading(false);
            shouldAutoSkipRef.current = true;
          }
        };

        hls.loadSource(streamUrl);
        hls.attachMedia(audio);

        hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          console.log('HLS manifest parsed, starting playback');
          try {
            await audio.play();
          } catch (err: any) {
            console.error('HLS playback error:', err);

            // Don't fallback for browser autoplay policy errors
            if (err.name === 'NotAllowedError') {
              console.log('Browser autoplay policy blocked HLS playback - user interaction required');
              setIsPlaying(false);
              setLoading(false);
              hls.destroy();
              hlsRef.current = null;
              return;
            }

            // Fallback to regular audio for other errors
            await fallbackToRegularAudio();
          }
        });

        hls.on(Hls.Events.ERROR, async (_event, data) => {
          console.error('HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Check if it's a CORS error or manifest load error
                if (data.details === 'manifestLoadError' || data.response?.code === 0) {
                  console.error('HLS CORS/manifest error - trying regular audio fallback...');
                  await fallbackToRegularAudio();
                } else {
                  console.log('Network error, trying to recover...');
                  hls.startLoad();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('HLS media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal HLS error - trying regular audio fallback...');
                await fallbackToRegularAudio();
                break;
            }
          }
        });
      } else if (isHLS && audio.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        console.log('Using native HLS support (Safari)');
        try {
          audio.removeAttribute('crossOrigin'); // Remove crossOrigin to avoid CORS issues
          audio.src = streamUrl;
          audio.load();
          await new Promise(resolve => setTimeout(resolve, 100));
          await audio.play();
        } catch (safariHlsErr: any) {
          // Don't fallback for browser autoplay policy errors
          if (safariHlsErr.name === 'NotAllowedError') {
            console.log('Browser autoplay policy blocked Safari HLS playback - user interaction required');
            setIsPlaying(false);
            setLoading(false);
            return;
          }

          console.warn('⚠️ Safari native HLS failed, falling back to regular audio playback...');
          // Clear any error message
          setError(null);

          // Try as regular audio
          try {
            audio.src = streamUrl;
            audio.load();
            await new Promise(resolve => setTimeout(resolve, 100));
            await audio.play();
            console.log('✅ Fallback to regular audio successful');
          } catch (fallbackErr: any) {
            console.error('❌ Fallback to regular audio also failed:', fallbackErr);

            // Don't show error or auto-skip for browser autoplay policy errors
            if (fallbackErr.name === 'NotAllowedError') {
              console.log('Browser autoplay policy blocked playback - user interaction required');
              setIsPlaying(false);
              setLoading(false);
              return;
            }

            // Don't show error in UI since validation already filtered bad streams
            console.log('Safari HLS fallback failed - auto-skipping to next station...');
            setIsPlaying(false);
            setLoading(false);
            shouldAutoSkipRef.current = true;
          }
        }
      } else {
        // Regular stream (MP3, AAC, etc.)
        console.log('Using regular audio playback');
        // Realtime-levels CORS probe: load with crossOrigin='anonymous' so the
        // element can safely be routed through Web Audio for frequency data.
        // Stations that failed the probe before are loaded without it (no
        // realtime levels for them).
        if (corsFailedStationsRef.current.has(currentStation.stationuuid)) {
          if (analyserRef.current?.element === audio) {
            // A Web-Audio-routed element loading a non-CORS stream would be
            // silent: swap in a fresh, unrouted element before loading.
            audio = recreateAudioElement();
          }
          audio.removeAttribute('crossOrigin'); // Remove crossOrigin to avoid CORS issues
        } else {
          ensureAudioContext(); // create/resume within the user-gesture chain
          audio.crossOrigin = 'anonymous';
          corsProbeActiveRef.current = true;
        }
        audio.src = streamUrl;
        audio.load();
        await new Promise(resolve => setTimeout(resolve, 100));
        await audio.play();
      }

      // Set initial volume based on tuning effect status
      if (tuningEffectEnabled && isTuning()) {
        // Will fade in when canplay event fires
        audio.volume = 0;
      } else {
        // If tuning effect is disabled, set to target volume immediately
        audio.volume = volume;
      }
    } catch (err: any) {
      // Ignore AbortError caused by rapid station switching
      if (err.name === 'AbortError') {
        console.log('Play interrupted by station change');
        return;
      }

      // Don't show error for browser autoplay policy errors
      if (err.name === 'NotAllowedError') {
        console.log('Browser autoplay policy blocked playback - user interaction required');
        setIsPlaying(false);
        setLoading(false);
        return;
      }

      // Don't show error in UI since validation already filtered bad streams
      console.error('Playback error:', err, `Failed to play ${currentStation.name}`);
      setIsPlaying(false);
      setLoading(false);
    }
  }, [currentStation, volume, isTuning, startTuningEffect, tuningEffectEnabled, recreateAudioElement, ensureAudioContext]);

  // Pause station
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // Next station
  const next = useCallback(async () => {
    if (stations.length === 0) return;

    // Prevent concurrent station changes
    if (isTuningRef.current) {
      console.log('⏸️ Station change already in progress, skipping');
      return;
    }

    isTuningRef.current = true;

    try {
      // Clear any previous error when switching stations
      setError(null);

      // Pause current playback
      pause();

      // 🎵 IMMEDIATELY start tuning effect (before validation) if enabled
      if (tuningEffectEnabled) {
        console.log('📻 Immediately starting tuning effect...');
        startTuningEffect({ volume: 0.4, preset: 'random' }); // Random preset for variety
      }
      setLoading(true);

      // Find next valid station
      const nextIndex = (currentIndex + 1) % stations.length;
      const validIndex = await findValidStation(nextIndex);

      if (validIndex !== null) {
        setCurrentIndex(validIndex);
        // Station will auto-play due to useEffect
        // Tuning effect will stop when station is ready (in oncanplay)
      } else {
        setError('No playable stations found');
        setLoading(false);
        // Stop tuning effect if no valid station found
        await stopTuningEffect(0.3);
      }
    } catch (error) {
      console.error('Error during station change:', error);
      setLoading(false);
      await stopTuningEffect(0.3);
    } finally {
      isTuningRef.current = false;
    }
  }, [currentIndex, stations.length, pause, findValidStation, stopTuningEffect, startTuningEffect, tuningEffectEnabled]);

  // Previous station
  const previous = useCallback(async () => {
    if (stations.length === 0) return;

    // Prevent concurrent station changes
    if (isTuningRef.current) {
      console.log('⏸️ Station change already in progress, skipping');
      return;
    }

    isTuningRef.current = true;

    try {
      // Clear any previous error when switching stations
      setError(null);

      // Pause current playback
      pause();

      // 🎵 IMMEDIATELY start tuning effect (before validation) if enabled
      if (tuningEffectEnabled) {
        console.log('📻 Immediately starting tuning effect...');
        startTuningEffect({ volume: 0.4, preset: 'random' }); // Random preset for variety
      }
      setLoading(true);

      // Find previous valid station
      const prevIndex = currentIndex === 0 ? stations.length - 1 : currentIndex - 1;
      const validIndex = await findValidStation(prevIndex);

      if (validIndex !== null) {
        setCurrentIndex(validIndex);
        // Station will auto-play due to useEffect
        // Tuning effect will stop when station is ready (in oncanplay)
      } else {
        setError('No playable stations found');
        setLoading(false);
        // Stop tuning effect if no valid station found
        await stopTuningEffect(0.3);
      }
    } catch (error) {
      console.error('Error during station change:', error);
      setLoading(false);
      await stopTuningEffect(0.3);
    } finally {
      isTuningRef.current = false;
    }
  }, [currentIndex, stations.length, pause, findValidStation, stopTuningEffect, startTuningEffect, tuningEffectEnabled]);

  // Keep the latest callbacks available to long-lived registrations (Media
  // Session handlers, CORS-probe recovery) - runs on every render.
  useEffect(() => {
    latestRef.current = { play, pause, next, previous, recreateAudioElement };
  });

  // ---- Sleep timer ----
  // Gentle stop: ramp the ELEMENT volume (not the volume state, which would
  // re-create the audio element) down to 0 over ~2s, pause, then restore the
  // element to the hook's volume state so the next play is at normal volume.
  const clearSleepIntervals = useCallback(() => {
    if (sleepRampIntervalRef.current) {
      clearInterval(sleepRampIntervalRef.current);
      sleepRampIntervalRef.current = null;
      // A ramp was cut short: bring volume back to the hook's volume state
      if (audioRef.current) {
        audioRef.current.volume = volumeRef.current;
      }
    }
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }
  }, []);

  // Configure the sleep timer. `null` (or non-positive) cancels; a positive
  // number (minutes, fractions allowed) starts/restarts the countdown. When
  // the countdown reaches 0 it fires once, gently stops playback, and leaves
  // sleepRemainingSec at 0 until a new timer is set or it is cancelled.
  const setSleepTimer = useCallback((minutes: number | null) => {
    // Cancel any running countdown/ramp first
    clearSleepIntervals();
    sleepFiredRef.current = false;

    if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) {
      sleepRemainingRef.current = null;
      setSleepMinutes(null);
      setSleepRemainingSec(null);
      return;
    }

    const totalSec = Math.round(minutes * 60);
    sleepRemainingRef.current = totalSec;
    setSleepMinutes(minutes);
    setSleepRemainingSec(totalSec);

    sleepIntervalRef.current = setInterval(() => {
      const remaining = (sleepRemainingRef.current ?? 0) - 1;
      sleepRemainingRef.current = Math.max(remaining, 0);
      setSleepRemainingSec(Math.max(remaining, 0));

      if (remaining > 0 || sleepFiredRef.current) return;

      // Countdown reached 0 - fire exactly once and stop ticking
      sleepFiredRef.current = true;
      if (sleepIntervalRef.current) {
        clearInterval(sleepIntervalRef.current);
        sleepIntervalRef.current = null;
      }

      const audio = audioRef.current;
      if (!audio || audio.paused) return;

      const startVolume = audio.volume;
      const steps = 20;
      const stepMs = 2000 / steps; // ~2 seconds total
      let step = 0;
      sleepRampIntervalRef.current = setInterval(() => {
        step++;
        const current = audioRef.current;
        if (!current || current.paused) {
          if (sleepRampIntervalRef.current) {
            clearInterval(sleepRampIntervalRef.current);
            sleepRampIntervalRef.current = null;
          }
          if (current) current.volume = volumeRef.current;
          return;
        }
        if (step >= steps) {
          if (sleepRampIntervalRef.current) {
            clearInterval(sleepRampIntervalRef.current);
            sleepRampIntervalRef.current = null;
          }
          current.pause();
          current.volume = volumeRef.current; // restore for the next play
          return;
        }
        current.volume = Math.max(startVolume - (startVolume / steps) * step, 0);
      }, stepMs);
    }, 1000);
  }, [clearSleepIntervals]);

  // Toggle play/pause — declared after next/previous so Play can fall through to "tune"
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (!currentStation && stations.length > 0) {
      // No station selected yet: treat Play as "tune the first available station"
      next();
    } else {
      play();
    }
  }, [isPlaying, play, pause, currentStation, stations.length, next]);

  // Auto-play when station changes
  useEffect(() => {
    // Only auto-play when station changed (not just isPlaying state change)
    const stationChanged = prevStationRef.current?.stationuuid !== currentStation?.stationuuid;

    if (stationChanged && currentStation) {
      // Check validation cache - don't auto-play if station is known to be invalid
      const cached = validationCacheRef.current.get(currentStation.stationuuid);
      if (cached === false) {
        console.log(`⏭️ Station ${currentStation.name} is cached as invalid, skipping auto-play`);
        // Trigger auto-skip since we know this station won't work
        shouldAutoSkipRef.current = true;
      } else {
        console.log('🎵 Station changed, auto-playing new station...');

        // Ensure tuning effect is playing during auto-play (especially for auto-skip scenarios)
        if (tuningEffectEnabled && !isTuning()) {
          console.log('📻 Starting tuning effect for auto-play...');
          startTuningEffect({ volume: 0.4, preset: 'random' });
        }

        play();
      }
    }

    // Update refs for next render
    prevStationRef.current = currentStation;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStation, play]);

  // Auto-skip on playback errors
  useEffect(() => {
    if (shouldAutoSkipRef.current && stations.length > 1 && !autoSkipPendingRef.current) {
      // Prevent infinite loop by limiting attempts
      if (maxAutoSkipAttemptsRef.current >= 5) {
        console.warn('Max auto-skip attempts reached, stopping');
        // Don't show error in UI since validation already filtered bad streams
        console.error('Unable to find playable station after 5 attempts');
        shouldAutoSkipRef.current = false;
        maxAutoSkipAttemptsRef.current = 0;
        autoSkipPendingRef.current = false;
        setError('No playable stations found in this area');
        return;
      }

      // Immediately reset flags to prevent duplicate auto-skips
      shouldAutoSkipRef.current = false;
      autoSkipPendingRef.current = true;
      const attemptNumber = maxAutoSkipAttemptsRef.current + 1;
      maxAutoSkipAttemptsRef.current = attemptNumber;

      console.log(`⏭️ Auto-skipping to next station (attempt ${attemptNumber}/5)...`);

      // Auto-skip to next station after a short delay
      const skipTimer = setTimeout(() => {
        const nextIndex = (currentIndex + 1) % stations.length;
        setCurrentIndex(nextIndex);
        autoSkipPendingRef.current = false;
      }, 500); // Reduced delay from 1000ms to 500ms for faster response

      return () => {
        clearTimeout(skipTimer);
        autoSkipPendingRef.current = false;
      };
    }
  }, [currentIndex, stations.length]); // Remove error from dependencies to prevent infinite loops

  // Note: Counter is reset when stations change (line 627)
  // We don't reset on currentIndex change to allow the max attempts protection to work during auto-skip

  // Reset index when stations change and auto-play first valid station
  const hasAutoPlayedRef = useRef(false);
  const stationsIdRef = useRef<string>('');

  useEffect(() => {
    // Create a unique ID for the current stations list
    const stationsId = stations.map(s => s.stationuuid).join(',');

    // Only run if stations actually changed (not just re-render)
    if (stationsId === stationsIdRef.current) {
      console.log('⏸️ Stations ID unchanged, skipping validation');
      return;
    }

    console.log('🆕 Stations changed, starting validation');
    stationsIdRef.current = stationsId;
    maxAutoSkipAttemptsRef.current = 0;
    hasAutoPlayedRef.current = false; // Reset when stations change
    validationCacheRef.current.clear(); // Clear validation cache for new stations
    isValidatingRef.current = false; // Reset validation lock

    // Find and set first valid station when stations are initially loaded
    if (stations.length > 0) {
      hasAutoPlayedRef.current = true;
      // New station will auto-play automatically

      // Find first valid station
      (async () => {
        const validIndex = await findValidStation(0);
        // Honor an explicit selection (deep link / map click / preset) made
        // while validation was running — never clobber the user's choice.
        const explicitUuid = explicitSelectionRef.current;
        const explicitIndex = explicitUuid
          ? stations.findIndex(s => s.stationuuid === explicitUuid)
          : -1;
        if (explicitIndex !== -1) {
          console.log(`🎯 Honoring explicit selection over auto-tune: ${stations[explicitIndex].name}`);
          setCurrentIndex(explicitIndex);
          return;
        }
        if (validIndex !== null) {
          setCurrentIndex(validIndex);
          // Trigger play after a short delay to ensure everything is loaded
          setTimeout(() => {
            console.log('🎵 Auto-playing first valid station on page load...');
            play();
          }, 500);
        } else {
          console.error('❌ No playable stations found in this region');
          setError('No playable stations found in this region');
          // Set to first station but don't trigger auto-play (it's known to be invalid)
          if (stations.length > 0) {
            setCurrentIndex(0);
          }
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations]); // Only run when stations array changes, not when play changes

  // Select and play a specific station by UUID
  const selectStation = useCallback((stationUuid: string) => {
    // Mark as the user's explicit choice so auto-tune won't override it
    explicitSelectionRef.current = stationUuid;
    const index = stations.findIndex(s => s.stationuuid === stationUuid);
    if (index !== -1) {
      console.log(`🎯 Selecting station: ${stations[index].name}`);
      setCurrentIndex(index);
      // Station will auto-play due to useEffect
    } else {
      console.warn(`Station with UUID ${stationUuid} not found`);
    }
  }, [stations]);

  // Realtime frequency levels for the equalizer UI: 8 bands (log-ish grouping
  // of the analyser's frequency bins, normalized 0..1). Returns null when the
  // analyser is not active for the current station (HLS streams, stations that
  // failed the CORS probe, or before a successful probe this load).
  const getLevels = useCallback((): number[] | null => {
    const entry = analyserRef.current;
    if (!entry || !analyserActiveRef.current) return null;
    const bins = new Uint8Array(entry.analyser.frequencyBinCount); // 64 bins at fftSize 128
    entry.analyser.getByteFrequencyData(bins);
    const bandCount = 8;
    const levels: number[] = [];
    for (let i = 0; i < bandCount; i++) {
      // Exponential edge spacing: low frequencies get finer resolution
      const start = Math.floor(bins.length * (Math.pow(bandCount, i / bandCount) - 1) / (bandCount - 1));
      const end = Math.floor(bins.length * (Math.pow(bandCount, (i + 1) / bandCount) - 1) / (bandCount - 1));
      const lo = Math.min(start, bins.length - 1);
      const hi = Math.max(Math.min(end, bins.length), lo + 1);
      let sum = 0;
      for (let j = lo; j < hi; j++) {
        sum += bins[j];
      }
      levels.push(sum / (hi - lo) / 255);
    }
    return levels;
  }, []);

  // Unmount cleanup: sleep timer intervals, analyser graph and the shared
  // levels AudioContext (kept out of the audio-init effect so it survives
  // element re-creation and only closes on unmount).
  useEffect(() => {
    return () => {
      clearSleepIntervals();
      disconnectAnalyser();
      if (audioCtxRef.current) {
        try {
          void audioCtxRef.current.close();
        } catch {
          // Ignore errors during cleanup
        }
        audioCtxRef.current = null;
      }
    };
  }, [clearSleepIntervals, disconnectAnalyser]);

  return {
    currentStation,
    currentIndex,
    isPlaying,
    loading,
    error,
    volume,
    validatingStream,
    setVolume,
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    selectStation,
    hasMultipleStations: stations.length > 1,
    canTune: stations.length > 0,
    sleepMinutes,
    sleepRemainingSec,
    setSleepTimer,
    signal,
    hasRealtimeLevels,
    getLevels,
  };
}
