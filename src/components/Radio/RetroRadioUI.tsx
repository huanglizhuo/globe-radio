import type { RadioStation } from '../../types';
import { StationInfo } from './StationInfo';
import { PlayerControls } from './PlayerControls';

interface RetroRadioUIProps {
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

export function RetroRadioUI({
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
}: RetroRadioUIProps) {
  return (
    <div className="absolute top-4 right-4 z-10 w-80 retro-radio">
      {/* Retro radio container with vintage styling */}
      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 rounded-2xl shadow-2xl border-4 border-amber-950 p-4 backdrop-blur-sm bg-opacity-95">

        {/* Radio speaker grill pattern */}
        <div className="relative mb-3">
          <div className="bg-gradient-to-b from-amber-950 to-amber-900 rounded-lg p-3">
            {/* Speaker grill dots pattern */}
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i % 3 === 0
                    ? 'bg-amber-700 shadow-inner'
                    : i % 3 === 1
                      ? 'bg-amber-800 shadow-inner'
                      : 'bg-amber-900 shadow-inner'
                    }`}
                />
              ))}
            </div>
          </div>

          {/* Vintage radio brand label */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <div className="bg-amber-950 px-3 py-1 rounded-full">
              <span className="text-amber-200 text-xs font-bold tracking-wider">GLOBE RADIO</span>
            </div>
          </div>
        </div>

        {/* Station display window */}
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-lg p-3 mb-3 border-2 border-amber-950">
          {/* Error Message */}
          {error && (
            <div className="mb-2 bg-red-900/80 border border-red-600 rounded px-2 py-1">
              <p className="text-red-200 text-xs text-center">
                ⚠️ {error}
              </p>
            </div>
          )}

          {/* Station Info */}
          <StationInfo station={currentStation} loading={loading} compact={true} />

          {/* Frequency display */}
          {currentStation && (
            <div className="mt-2 text-center">
              <div className="inline-block bg-green-900/50 px-3 py-1 rounded border border-green-700">
                <span className="text-green-400 font-mono text-xs">
                  FM {Math.random() * 100 + 80 | 0}.{Math.random() * 9 | 0} MHz
                </span>
              </div>
              <div className="mt-1">
                <span className="text-amber-500 font-mono text-xs">
                  {currentStation.codec} • {currentStation.bitrate || 0} kbps
                </span>
              </div>
            </div>
          )}

          {!currentStation && !loading && (
            <div className="text-center py-2">
              <span className="text-amber-600 text-xs">📻 No Signal</span>
            </div>
          )}
        </div>

        {/* Modern player controls with vintage styling */}
        <div className="bg-gradient-to-b from-amber-950 to-black rounded-lg p-2">
          <PlayerControls
            isPlaying={isPlaying}
            loading={loading}
            hasMultipleStations={hasMultipleStations}
            onPlayPause={onPlayPause}
            onPrevious={onPrevious}
            onNext={onNext}
            volume={volume}
            onVolumeChange={onVolumeChange}
            compact={true}
          />
        </div>
      </div>

      {/* Retro radio shadow */}
      <div className="absolute -bottom-2 left-2 right-2 h-4 bg-black/20 rounded-full blur-xl" />
    </div>
  );
}