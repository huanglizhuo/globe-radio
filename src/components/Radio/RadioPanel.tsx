import type { RadioStation } from '../../types';
import { StationInfo } from './StationInfo';
import { PlayerControls } from './PlayerControls';

interface RadioPanelProps {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  loading: boolean;
  error: string | null;
  hasMultipleStations: boolean;
  volume: number;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onVolumeChange: (volume: number) => void;
}

export function RadioPanel({
  currentStation,
  isPlaying,
  loading,
  error,
  hasMultipleStations,
  volume,
  onPlayPause,
  onPrevious,
  onNext,
  onVolumeChange,
}: RadioPanelProps) {
  return (
    <div className="w-full h-[30vh] bg-gradient-to-b from-gray-900 to-gray-800 border-t-4 border-red-600">
      <div className="max-w-2xl mx-auto h-full flex flex-col justify-between">
        {/* Vintage radio display */}
        <div className="relative">
          {/* Radio speaker grill effect */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/20 to-transparent" />

          {/* Error Message */}
          {error && (
            <div className="px-4 py-2 mx-4 mt-2 bg-red-900/50 border border-red-600/50 rounded-lg">
              <p className="text-red-200 text-sm text-center">
                ⚠️ {error}
              </p>
              {error.includes('CORS') && (
                <p className="text-red-300/70 text-xs text-center mt-1">
                  Try another station or use the next button
                </p>
              )}
            </div>
          )}

          {/* Station Info */}
          <StationInfo station={currentStation} loading={loading} />

          {/* Frequency display (decorative) */}
          {currentStation && (
            <div className="text-center">
              <div className="inline-block px-4 py-1 bg-black/30 rounded-lg">
                <span className="text-red-500 font-mono text-sm">
                  {currentStation.codec} • {currentStation.bitrate || 0} kbps
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Player Controls */}
        <PlayerControls
          isPlaying={isPlaying}
          loading={loading}
          hasMultipleStations={hasMultipleStations}
          onPlayPause={onPlayPause}
          onPrevious={onPrevious}
          onNext={onNext}
          volume={volume}
          onVolumeChange={onVolumeChange}
        />

        {/* Vintage radio base effect */}
        <div className="h-3 bg-gradient-to-t from-gray-950 to-transparent" />
      </div>
    </div>
  );
}
