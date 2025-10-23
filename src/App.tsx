import { useCallback, useEffect, useRef, useState } from 'react';
import { MapLibreGlobe, type MapLibreGlobeHandle } from './components/Map/MapLibreGlobe';
import { RetroRadioUI } from './components/Radio/RetroRadioUI';
import { FloatingInfo } from './components/UI/FloatingInfo';
import { useRadioStations } from './hooks/useRadioStations';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import type { Coordinates } from './types';

function App() {
  const mapRef = useRef<MapLibreGlobeHandle>(null);
  const [tuningEffectEnabled, setTuningEffectEnabled] = useState(true); // Default: enabled
  const { stations, loading: stationsLoading, searchStations } = useRadioStations();
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
    hasMultipleStations,
  } = useAudioPlayer(stations, tuningEffectEnabled);

  // Handle map location change
  const handleLocationChange = useCallback((lat: number, lon: number) => {
    const coordinates: Coordinates = { lat, lon };
    console.log(`Location changed to: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
    searchStations(coordinates);
  }, [searchStations]);

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
          mapRef.current?.jumpToRandomLocation();
          console.log('⌨️ Enter pressed - jumping to random location');
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
      <MapLibreGlobe ref={mapRef} onLocationChange={handleLocationChange} />

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
          <p className="text-white text-sm">🔍 Searching for stations...</p>
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
