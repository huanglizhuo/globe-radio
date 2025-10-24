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
  tuningEffectEnabled: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleTuningEffect: () => void;
}

export function RetroRadioUI({
  currentStation,
  isPlaying,
  loading,
  error,
  hasMultipleStations,
  volume,
  // tuningEffectEnabled, // Currently unused
  onPlayPause,
  onPrevious,
  onNext,
  onVolumeChange,
  // onToggleTuningEffect, // Currently unused
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
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="bg-amber-950 px-6 py-1 rounded-full whitespace-nowrap ">
              <span className="text-amber-200 text-xs font-bold">GLOBE RADIO</span>
            </div>
            <div className="bg-amber-950 px-4 py-1 rounded-full">
              <a
                href="https://github.com/huanglizhuo/globe-radio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-200 hover:text-white transition-colors duration-200 flex items-center gap-1"
                title="View on GitHub"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="inline-block"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span className="text-xs font-bold">Github</span>
              </a>
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
            <div className="mt-2 mb-2 text-center">
              <div className="inline-block bg-green-900/50 px-3 py-1 rounded border border-green-700">
                <span className="text-green-400 font-mono text-xs">
                  FM {Math.random() * 100 + 80 | 0}.{Math.random() * 9 | 0} MHz
                </span>
              </div>
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

        {/* Tuning Effect Toggle hide it for now */}
        {/* <div className="mt-2 bg-gradient-to-b from-amber-950 to-black rounded-lg p-2 border border-amber-900">
          <button
            onClick={onToggleTuningEffect}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-amber-900/30 transition-colors group"
            title={tuningEffectEnabled ? 'Disable tuning sound effect' : 'Enable tuning sound effect'}
          >
            <div className="flex items-center gap-2">
              <span className="text-amber-200 text-xs font-medium">Tuning Effect</span>
              <span className="text-amber-500/60 text-[10px]">
                {tuningEffectEnabled ? '(ON)' : '(OFF)'}
              </span>
            </div>
            <div className={`relative w-10 h-5 rounded-full transition-colors ${tuningEffectEnabled ? 'bg-green-600' : 'bg-gray-600'
              }`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${tuningEffectEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
            </div>
          </button>
        </div> */}
      </div>

      {/* Retro radio shadow */}
      <div className="absolute -bottom-2 left-2 right-2 h-4 bg-black/20 rounded-full blur-xl" />
    </div>
  );
}