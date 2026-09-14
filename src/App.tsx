import { useCallback, useEffect, useRef, useState } from 'react';
import { MapLibreGlobe, type MapLibreGlobeHandle } from './components/Map/MapLibreGlobe';
import { RetroRadioUI } from './components/Radio/RetroRadioUI';
import { FloatingInfo } from './components/UI/FloatingInfo';
import { PassportPanel } from './components/UI/PassportPanel';
import { useRadioStations } from './hooks/useRadioStations';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { getCountryLocationWithFallback } from './utils/countryCoordinates';
import { loadPresets, savePreset, type RadioPreset } from './utils/presets';
import { getPassport, recordStationHeard, type PassportData } from './utils/passport';
import type { Coordinates, RadioStation } from './types';

const TUNING_STATIC_KEY = 'gr-tuning-static-v1';
const WORLD_TOUR_INTERVAL_MS = 30_000;
const STATION_HASH_PATTERN = /^#\/station\/([0-9a-f-]{36})$/;

/** Read the persisted tuning-static preference (default: on). */
function loadTuningStaticPreference(): boolean {
  try {
    const raw = localStorage.getItem(TUNING_STATIC_KEY);
    if (raw === null) return true;
    return raw !== '0';
  } catch {
    // localStorage unavailable or corrupt — default to on.
    return true;
  }
}

function App() {
  const mapRef = useRef<MapLibreGlobeHandle>(null);
  const [tuningEffectEnabled, setTuningEffectEnabled] = useState(loadTuningStaticPreference);
  const [initialLocation, setInitialLocation] = useState<Coordinates | null>(null);
  const lastSearchedCoordsRef = useRef<Coordinates | null>(null);
  const { allStations, playableStations, loading: stationsLoading, loadAllStations, searchStations } = useRadioStations();
  const {
    currentStation,
    isPlaying,
    loading: playerLoading,
    error: playerError,
    volume,
    validatingStream,
    signal,
    hasRealtimeLevels,
    getLevels,
    sleepMinutes,
    sleepRemainingSec,
    setSleepTimer,
    setVolume,
    togglePlayPause,
    next,
    previous,
    selectStation,
    hasMultipleStations,
    canTune,
  } = useAudioPlayer(playableStations, tuningEffectEnabled);

  /* ---- Preset slots (P1–P6, persisted in localStorage) ---- */
  const [presets, setPresets] = useState<RadioPreset[]>(() => loadPresets());
  const [presetsBump, setPresetsBump] = useState(0);

  // Re-read presets from storage after each save (bump = 0 is the initial load)
  useEffect(() => {
    if (presetsBump === 0) return;
    setPresets(loadPresets());
  }, [presetsBump]);

  const handlePresetSave = useCallback((slot: number) => {
    if (!currentStation) return;
    savePreset(slot, currentStation);
    setPresetsBump((bump) => bump + 1);
  }, [currentStation]);

  const handlePresetActivate = useCallback((slot: number) => {
    const preset = presets.find((p) => p.slot === slot);
    if (!preset) return; // Empty slot — nothing to do

    if (playableStations.some((station) => station.stationuuid === preset.stationuuid)) {
      selectStation(preset.stationuuid);
      return;
    }

    if (preset.lat != null && preset.lon != null) {
      const coordinates: Coordinates = { lat: preset.lat, lon: preset.lon };
      lastSearchedCoordsRef.current = coordinates;
      void searchStations(coordinates);
      mapRef.current?.flyToLocation(preset.lat, preset.lon);
      window.setTimeout(() => {
        selectStation(preset.stationuuid);
      }, 250);
    }
  }, [presets, playableStations, selectStation, searchStations]);

  /* ---- World tour (auto-hop to a random city every 30s) ---- */
  const [worldTourActive, setWorldTourActive] = useState(false);

  const handleToggleWorldTour = useCallback(() => {
    setWorldTourActive((active) => !active);
  }, []);

  // Each hop goes through the existing location-search → auto-play flow
  useEffect(() => {
    if (!worldTourActive) return;
    mapRef.current?.jumpToRandomLocation();
    const intervalId = window.setInterval(() => {
      mapRef.current?.jumpToRandomLocation();
    }, WORLD_TOUR_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [worldTourActive]);

  // A user grabbing the globe takes over from the tour
  const handleUserInteractionStart = useCallback(() => {
    setWorldTourActive((active) => (active ? false : active));
  }, []);

  /* ---- Listening passport ---- */
  const [passportOpen, setPassportOpen] = useState(false);
  const [passportData, setPassportData] = useState<PassportData>(() => getPassport());
  const [passportCountryCount, setPassportCountryCount] = useState(
    () => getPassport().stamps.length,
  );

  // Stamp the passport whenever a station with a known country is tuned in
  useEffect(() => {
    if (!currentStation?.countrycode) return;
    recordStationHeard(currentStation);
    setPassportCountryCount(getPassport().stamps.length);
  }, [currentStation]);

  const handleOpenPassport = useCallback(() => {
    setPassportData(getPassport());
    setPassportOpen(true);
  }, []);

  /* ---- Deep link: #/station/{uuid} ---- */
  const handledHashRef = useRef<string | null>(null);

  // Resolve a shared station link: look the uuid up, clear the hash (so nothing
  // can re-trigger it), then fly there and tune in. Fire-and-forget.
  const handleStationDeepLink = useCallback(async () => {
    const hash = window.location.hash;
    const match = STATION_HASH_PATTERN.exec(hash);
    if (!match || handledHashRef.current === hash) return;
    handledHashRef.current = hash;
    const uuid = match[1];

    try {
      const response = await fetch(`/api/radio/json/stations/byuuid?uuids=${uuid}`);
      if (!response.ok) return;
      const results = (await response.json()) as RadioStation[];
      const station = Array.isArray(results) ? results[0] : undefined;
      if (!station) return;

      // Clear the hash FIRST (before any further actions) to prevent loops
      window.history.replaceState(null, '', window.location.pathname);

      if (station.geo_lat != null && station.geo_long != null) {
        const coordinates: Coordinates = { lat: station.geo_lat, lon: station.geo_long };
        lastSearchedCoordsRef.current = coordinates;
        // ensureStation: the shared station must be in the playable list even
        // if the geo search doesn't naturally return it
        await searchStations(coordinates, station);
        mapRef.current?.flyToLocation(station.geo_lat, station.geo_long);
        window.setTimeout(() => {
          selectStation(uuid);
        }, 300);
      } else if (playableStations.some((s) => s.stationuuid === uuid)) {
        selectStation(uuid);
      }
    } catch {
      // Deep-link lookup failed — leave the globe as-is.
    }
  }, [playableStations, searchStations, selectStation]);

  useEffect(() => {
    const onHashChange = () => {
      void handleStationDeepLink();
    };
    void handleStationDeepLink();
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [handleStationDeepLink]);

  // Handle station marker click
  const handleStationClick = useCallback(async (stationUuid: string, lat: number, lon: number) => {
    console.log(`🎯 Station clicked: ${stationUuid} at ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);

    // First, search for local stations at that location
    const coordinates: Coordinates = { lat, lon };
    lastSearchedCoordsRef.current = coordinates;
    await searchStations(coordinates);

    // Then try to select the clicked station (it should now be in playableStations)
    // We need to wait a bit for the state to update
    setTimeout(() => {
      selectStation(stationUuid);
    }, 100);
  }, [selectStation, searchStations]);

  // Handle map location change - search for local stations
  const handleLocationChange = useCallback((lat: number, lon: number) => {
    const coordinates: Coordinates = { lat, lon };
    console.log(`🗺️ Location changed to: ${lat.toFixed(2)}°, ${lon.toFixed(2)}° - searching local stations`);
    lastSearchedCoordsRef.current = coordinates;
    searchStations(coordinates);
  }, [searchStations]);

  // Retry the last station search (recovery affordance for the LOST SIGNAL state)
  const handleRetrySearch = useCallback(() => {
    if (lastSearchedCoordsRef.current) {
      searchStations(lastSearchedCoordsRef.current);
    }
  }, [searchStations]);

  // Load all stations globally on app initialization
  useEffect(() => {
    console.log('🌍 App initialized - loading all stations...');
    loadAllStations(10000); // Load up to 10,000 stations with geo coordinates
  }, [loadAllStations]);

  // Detect user's country on app initialization
  useEffect(() => {
    const detectCountry = async () => {
      try {
        console.log('🌍 Detecting user country...');
        const response = await fetch('/api/country');
        const data = await response.json();

        if (data.detected && data.country) {
          const countryLocation = getCountryLocationWithFallback(data.country);
          setInitialLocation({
            lat: countryLocation.lat,
            lon: countryLocation.lon
          });
          console.log(`🌍 Country-based location set: ${countryLocation.city}`);
        } else {
          console.log('❌ Country detection failed, using random location');
          setInitialLocation(null); // Will trigger random location
        }
      } catch (error) {
        console.error('❌ Country detection error:', error);
        setInitialLocation(null); // Will trigger random location
      }
    };

    detectCountry();
  }, []);

  // Handle tuning effect toggle (persisted)
  const handleToggleTuningEffect = useCallback(() => {
    setTuningEffectEnabled(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem(TUNING_STATIC_KEY, newValue ? '1' : '0');
      } catch {
        // Storage unavailable — the preference just won't persist.
      }
      console.log(`🎵 Tuning effect ${newValue ? 'enabled' : 'disabled'}`);
      return newValue;
    });
  }, []);

  // Handle keyboard events (spacebar to toggle play/pause, arrows for navigation)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keys if not typing in an input/textarea
      if (
        event.target instanceof Element &&
        ['INPUT', 'TEXTAREA'].includes(event.target.tagName)
      ) {
        return;
      }

      // Digit1..Digit6 / Numpad1..Numpad6 → activate preset N
      const presetKeyMatch = /^(?:Digit|Numpad)([1-6])$/.exec(event.code);
      if (presetKeyMatch) {
        handlePresetActivate(Number(presetKeyMatch[1]));
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault(); // Prevent page scrolling
          togglePlayPause();
          console.log('⌨️ Spacebar pressed - toggling play/pause');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          previous();
          console.log('⌨️ Arrow Left pressed - previous station');
          break;
        case 'ArrowRight':
          event.preventDefault();
          next();
          console.log('⌨️ Arrow Right pressed - next station');
          break;
        case 'Enter':
          event.preventDefault();
          if (mapRef.current) {
            console.log('⌨️ Enter pressed - jumping to random location');
            mapRef.current.jumpToRandomLocation();
          } else {
            console.warn('⚠️ Enter pressed but map ref is null');
          }
          break;
        case 'KeyT':
          handleToggleWorldTour();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlayPause, next, previous, handlePresetActivate, handleToggleWorldTour]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-paper">
      {/* Map fills entire screen */}
      <MapLibreGlobe
        ref={mapRef}
        onLocationChange={handleLocationChange}
        initialLocation={initialLocation}
        stations={allStations}
        currentStationUuid={currentStation?.stationuuid ?? null}
        onStationClick={handleStationClick}
        onUserInteractionStart={handleUserInteractionStart}
      />

      {/* Atmospheric vignette for chrome legibility */}
      <div className="map-vignette pointer-events-none absolute inset-0 z-[5]" aria-hidden="true" />

      {/* Retro Radio UI — desktop panel / mobile dock */}
      <RetroRadioUI
        currentStation={currentStation}
        isPlaying={isPlaying}
        loading={playerLoading}
        error={playerError}
        hasMultipleStations={hasMultipleStations}
        canTune={canTune}
        stations={playableStations}
        onSelectStation={selectStation}
        volume={volume}
        tuningEffectEnabled={tuningEffectEnabled}
        onPlayPause={togglePlayPause}
        onPrevious={previous}
        onNext={next}
        onVolumeChange={setVolume}
        onToggleTuningEffect={handleToggleTuningEffect}
        onRetry={handleRetrySearch}
        signal={signal}
        hasRealtimeLevels={hasRealtimeLevels}
        getLevels={getLevels}
        sleepMinutes={sleepMinutes}
        sleepRemainingSec={sleepRemainingSec}
        onSetSleepTimer={setSleepTimer}
        presets={presets}
        onPresetActivate={handlePresetActivate}
        onPresetSave={handlePresetSave}
        worldTourActive={worldTourActive}
        onToggleWorldTour={handleToggleWorldTour}
        onOpenPassport={handleOpenPassport}
        passportCountryCount={passportCountryCount}
      />

      {/* Unified status chip (loading / validating) */}
      {(stationsLoading || validatingStream) && (
        <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-veil-chip px-3.5 py-1.5 shadow-panel backdrop-blur-md">
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25"
            style={{ borderTopColor: 'var(--color-lcd-readout)' }}
            aria-hidden="true"
          />
          <span className="lcd-dim text-2xs uppercase tracking-[0.14em]">
            {validatingStream ? 'Validating streams' : 'Searching stations'}
          </span>
          <span className="sr-only">Loading</span>
        </div>
      )}

      {/* Help / shortcuts popover */}
      <FloatingInfo />

      {/* Listening passport dialog */}
      <PassportPanel open={passportOpen} onClose={() => setPassportOpen(false)} data={passportData} />
    </div>
  );
}

export default App;
