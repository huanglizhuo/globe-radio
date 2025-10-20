interface PlayerControlsProps {
  isPlaying: boolean;
  loading: boolean;
  hasMultipleStations: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  compact?: boolean;
}

export function PlayerControls({
  isPlaying,
  loading,
  hasMultipleStations,
  onPlayPause,
  onPrevious,
  onNext,
  volume,
  onVolumeChange,
  compact = false,
}: PlayerControlsProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2">
        {/* Previous button */}
        {hasMultipleStations && (
          <button
            onClick={onPrevious}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            aria-label="Previous station"
          >
            <svg
              className="w-4 h-4 text-amber-100"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Play/Pause button */}
        <button
          onClick={onPlayPause}
          disabled={loading}
          className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Next button */}
        {hasMultipleStations && (
          <button
            onClick={onNext}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            aria-label="Next station"
          >
            <svg
              className="w-4 h-4 text-amber-100"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}

        {/* Volume control - compact */}
        <div className="flex items-center gap-1 ml-auto">
          <svg
            className="w-3 h-3 text-amber-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1 bg-amber-800 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Main controls */}
      <div className="flex items-center gap-4">
        {/* Previous button - only show if multiple stations */}
        {hasMultipleStations && (
          <button
            onClick={onPrevious}
            disabled={loading}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            aria-label="Previous station"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Play/Pause button */}
        <button
          onClick={onPlayPause}
          disabled={loading}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center shadow-lg"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg
              className="w-8 h-8 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Next button - only show if multiple stations */}
        {hasMultipleStations && (
          <button
            onClick={onNext}
            disabled={loading}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            aria-label="Next station"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Volume control */}
      <div className="flex items-center gap-3 w-48">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
        />
        <span className="text-xs text-gray-400 w-8">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
}
