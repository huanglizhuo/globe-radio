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
  } = useAudioPlayer(playableStations, tuningEffectEnabled);

  // Handle station marker click
  const handleStationClick = useCallback(async (stationUuid: string, lat: number, lon: number) => {
    console.log(`🎯 Station clicked: ${stationUuid} at ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);

    // First, search for local stations at that location
    const coordinates: Coordinates = { lat, lon };
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
    searchStations(coordinates);
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
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* Map fills entire screen */}
      <MapLibreGlobe
        ref={mapRef}
        onLocationChange={handleLocationChange}
        initialLocation={initialLocation}
        stations={allStations}
        currentStationUuid={currentStation?.stationuuid ?? null}
        onStationClick={handleStationClick}
      />

      {/* Retro Radio UI - top right */}
      <RetroRadioUI
        currentStation={currentStation}
        isPlaying={isPlaying}
        loading={playerLoading}
        error={playerError}
        hasMultipleStations={hasMultipleStations}
        volume={volume}
        tuningEffectEnabled={tuningEffectEnabled}
        onPlayPause={togglePlayPause}
        onPrevious={previous}
        onNext={next}
        onVolumeChange={setVolume}
        onToggleTuningEffect={handleToggleTuningEffect}
      />

      {/* Loading indicator */}
      {stationsLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded-lg backdrop-blur-sm z-10">
          <p className="text-white text-sm">🔍 Loading radio stations...</p>
        </div>
      )}

      {/* Validating stream indicator */}
      {validatingStream && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded-lg backdrop-blur-sm z-10">
          <p className="text-white text-sm">🔍 Validating streams...</p>
        </div>
      )}

      {/* Floating Info Panel */}
      <FloatingInfo />
    </div>
  );
}

export default App;
