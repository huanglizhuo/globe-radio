import type { CSSProperties } from 'react';

interface PlayerControlsProps {
  isPlaying: boolean;
  loading: boolean;
  hasMultipleStations: boolean;
  /** Disable Play only when there is genuinely nothing to tune. */
  playDisabled?: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  /** 'lg' for the desktop panel, 'md' for the mobile dock (both ≥44px touch targets). */
  size?: 'lg' | 'md';
  showVolume?: boolean;
}

export function PlayerControls({
  isPlaying,
  loading,
  hasMultipleStations,
  playDisabled = false,
  onPlayPause,
  onPrevious,
  onNext,
  volume,
  onVolumeChange,
  size = 'lg',
  showVolume = true,
}: PlayerControlsProps) {
  const skipBtn =
    size === 'lg'
      ? 'h-11 w-11'
      : 'h-11 w-11';
  const playBtn = size === 'lg' ? 'h-14 w-14' : 'h-12 w-12';
  const playIcon = size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const spinner = size === 'lg' ? 'h-6 w-6 border-2' : 'h-5 w-5 border-2';

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Previous station */}
      {hasMultipleStations && (
        <button
          onClick={onPrevious}
          disabled={loading}
          className={`${skipBtn} flex items-center justify-center rounded-full bg-walnut-700 text-ivory-300 transition-colors duration-150 hover:bg-walnut-600 hover:text-ivory-100 active:bg-walnut-950 disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label="Previous station"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Play / Pause */}
      <button
        onClick={onPlayPause}
        disabled={loading || playDisabled}
        className={`${playBtn} flex items-center justify-center rounded-full bg-accent text-white shadow-lg transition-[background-color,transform] duration-150 hover:bg-accent-hover active:translate-y-px active:bg-accent-press disabled:cursor-not-allowed disabled:opacity-50`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {loading ? (
          <div className={`${spinner} animate-spin rounded-full border-white border-t-transparent`} />
        ) : isPlaying ? (
          <svg className={playIcon} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className={`${playIcon} ml-0.5`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Next station */}
      {hasMultipleStations && (
        <button
          onClick={onNext}
          disabled={loading}
          className={`${skipBtn} flex items-center justify-center rounded-full bg-walnut-700 text-ivory-300 transition-colors duration-150 hover:bg-walnut-600 hover:text-ivory-100 active:bg-walnut-950 disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label="Next station"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Volume */}
      {showVolume && (
        <div className="ml-2 flex min-w-0 flex-1 items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-ivory-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="volume-range min-w-0 flex-1"
            style={{ '--fill': `${volume * 100}%` } as CSSProperties}
            aria-label="Volume"
          />
          <span className="lcd-dim w-9 shrink-0 text-right text-2xs">{Math.round(volume * 100)}%</span>
        </div>
      )}
    </div>
  );
}
