import { useCallback, useEffect, useRef, useState } from 'react';
import { MapLibreGlobe, type MapLibreGlobeHandle } from './components/Map/MapLibreGlobe';
import { RetroRadioUI } from './components/Radio/RetroRadioUI';
import { FloatingInfo } from './components/UI/FloatingInfo';
import { useRadioStations } from './hooks/useRadioStations';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { getCountryLocationWithFallback } from './utils/countryCoordinates';
import type { Coordinates } from './types';

function App() {
  const mapRef = useRef<MapLibreGlobeHandle>(null);
  const [tuningEffectEnabled, setTuningEffectEnabled] = useState(false); // Default: disabled
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
    setVolume,
    togglePlayPause,
    next,
    previous,
    selectStation,
    hasMultipleStations,
    canTune,
  } = useAudioPlayer(playableStations, tuningEffectEnabled);

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

  // Handle tuning effect toggle
  const handleToggleTuningEffect = useCallback(() => {
    setTuningEffectEnabled(prev => {
      const newValue = !prev;
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlayPause, next, previous]);

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
    </div>
  );
}

export default App;
