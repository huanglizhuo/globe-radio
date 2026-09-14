import { useEffect, useState, type CSSProperties } from 'react';
import type { RadioStation } from '../../types';
import { StationInfo, stableFrequency } from './StationInfo';
import { StationList } from './StationList';
import { PlayerControls } from './PlayerControls';

interface RetroRadioUIProps {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  loading: boolean;
  error: string | null;
  hasMultipleStations: boolean;
  canTune: boolean;
  stations: RadioStation[];
  volume: number;
  tuningEffectEnabled: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleTuningEffect: () => void;
  onRetry: () => void;
  onSelectStation: (stationUuid: string) => void;
}

function GitHubLink({ className = '' }: { className?: string }) {
  return (
    <a
      href="https://github.com/huanglizhuo/globe-radio"
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 text-ivory-500 transition-colors duration-150 hover:text-ivory-100 ${className}`}
      aria-label="View Globe Radio on GitHub"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
      <span className="font-display text-2xs font-bold uppercase tracking-[0.14em]">GitHub</span>
    </a>
  );
}

function VolumeRow({
  volume,
  onVolumeChange,
}: {
  volume: number;
  onVolumeChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
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
  );
}

export function RetroRadioUI({
  currentStation,
  isPlaying,
  loading,
  error,
  hasMultipleStations,
  canTune,
  stations,
  volume,
  // tuningEffectEnabled / onToggleTuningEffect reserved — toggle hidden for now
  onPlayPause,
  onPrevious,
  onNext,
  onVolumeChange,
  onRetry,
  onSelectStation,
}: RetroRadioUIProps) {
  const [expanded, setExpanded] = useState(false);

  // Escape closes the mobile details sheet
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Only one overlay open at a time: the help popover announces itself and we yield
  useEffect(() => {
    const onClose = () => setExpanded(false);
    window.addEventListener('gr:close-station-sheet', onClose);
    return () => window.removeEventListener('gr:close-station-sheet', onClose);
  }, []);

  const freq = currentStation ? stableFrequency(currentStation.stationuuid) : null;
  const status = loading
    ? 'TUNING'
    : error
      ? 'LOST SIGNAL'
      : isPlaying
        ? 'ON AIR'
        : currentStation
          ? 'PAUSED'
          : 'STATIC';
  // Play is only a dead end when there is genuinely nothing to tune
  const playDisabled = loading || (!currentStation && !canTune);

  return (
    <>
      {/* ============ Desktop / tablet: walnut receiver panel ============ */}
      <aside
        className="absolute right-4 top-4 z-10 hidden w-[336px] rounded-2xl border border-walnut-950 bg-gradient-to-br from-walnut-800 via-walnut-700 to-walnut-800 p-4 shadow-panel md:block"
        aria-label="Radio player"
      >
        <span className="screw left-2 top-2" aria-hidden="true" />
        <span className="screw right-2 top-2" aria-hidden="true" />
        <span className="screw bottom-2 left-2" aria-hidden="true" />
        <span className="screw bottom-2 right-2" aria-hidden="true" />

        {/* Brand plate */}
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-xs font-extrabold uppercase tracking-[0.24em] text-ivory-300">
            Globe Radio
          </span>
          <div className="flex items-center gap-3">
            <span
              className={`h-2 w-2 rounded-full ${isPlaying ? 'led-on bg-signal' : 'bg-white/15'}`}
              title={isPlaying ? 'On air' : 'Idle'}
              aria-hidden="true"
            />
            <GitHubLink />
          </div>
        </div>

        {/* Speaker grill */}
        <div className="mb-3 rounded-lg bg-gradient-to-b from-walnut-950 to-walnut-900 p-2.5" aria-hidden="true">
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 36 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i % 3 === 0 ? 'bg-walnut-700' : i % 3 === 1 ? 'bg-walnut-800' : 'bg-walnut-900'
                }`}
              />
            ))}
          </div>
        </div>

        {/* LCD readout */}
        <div
          className="lcd-window mb-3 rounded-lg border border-walnut-950 px-3 py-2.5"
          role="status"
          aria-live="polite"
        >
          <StationInfo station={currentStation} loading={loading} variant="panel" />
          {error && (
            <div className="mt-2 flex items-center justify-center gap-3">
              <p className="lcd-error text-center">⚠ {error}</p>
              <button
                onClick={onRetry}
                className="shrink-0 rounded-md border border-ivory-500/40 px-3 py-1.5 font-display text-2xs font-bold uppercase tracking-[0.14em] text-ivory-300 transition-colors duration-150 hover:bg-white/10 hover:text-ivory-100 active:bg-white/15"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="rounded-lg bg-gradient-to-b from-walnut-950 to-black/60 p-3">
          <PlayerControls
            isPlaying={isPlaying}
            loading={loading}
            hasMultipleStations={hasMultipleStations}
            playDisabled={playDisabled}
            onPlayPause={onPlayPause}
            onPrevious={onPrevious}
            onNext={onNext}
            volume={volume}
            onVolumeChange={onVolumeChange}
            size="lg"
            showVolume
          />
        </div>

        {/* Keyboard/screen-reader path to station selection */}
        {stations.length > 0 && (
          <div className="mt-3">
            <StationList
              stations={stations}
              currentStationUuid={currentStation?.stationuuid ?? null}
              onSelect={onSelectStation}
            />
          </div>
        )}
      </aside>

      {/* ============ Mobile: bottom dock + expandable sheet ============ */}
      <div className="md:hidden">
        {expanded && (
          <div
            className="sheet-enter fixed inset-x-0 bottom-0 z-20 pb-[calc(76px+env(safe-area-inset-bottom,0px))]"
            role="region"
            aria-label="Station details"
          >
            <div className="mx-3 mb-2 rounded-2xl border border-walnut-950 bg-gradient-to-b from-walnut-800 to-walnut-900 p-4 shadow-panel">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-2xs font-extrabold uppercase tracking-[0.24em] text-ivory-300">
                  Globe Radio
                </span>
                <GitHubLink />
              </div>

              <div className="lcd-window mb-3 rounded-lg px-3 py-2.5" role="status" aria-live="polite">
                <StationInfo station={currentStation} loading={loading} variant="detail" />
                {error && (
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <p className="lcd-error text-center">⚠ {error}</p>
                    <button
                      onClick={onRetry}
                      className="h-9 shrink-0 rounded-md border border-ivory-500/40 px-4 font-display text-2xs font-bold uppercase tracking-[0.14em] text-ivory-300 transition-colors duration-150 hover:bg-white/10 hover:text-ivory-100 active:bg-white/15"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <VolumeRow volume={volume} onVolumeChange={onVolumeChange} />

              {/* Keyboard/screen-reader path to station selection */}
              <div className="mt-3">
                <StationList
                  stations={stations}
                  currentStationUuid={currentStation?.stationuuid ?? null}
                  onSelect={onSelectStation}
                />
              </div>

              <p className="mt-3 text-2xs text-ivory-500">
                Drag the globe to change location · tap a green dot to play that station
              </p>
            </div>
          </div>
        )}

        {/* Dock */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-gradient-to-b from-walnut-800 to-walnut-950 shadow-dock">
          <div
            className="flex items-center gap-1 px-2 py-2"
            style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Readout: tap to expand */}
            <button
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors duration-150 hover:bg-white/5"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse station details' : 'Expand station details'}
            >
              <span className="lcd-window flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-lg" aria-hidden="true">
                {currentStation?.countrycode ? (
                  <span>
                    {String.fromCodePoint(
                      ...currentStation.countrycode
                        .toUpperCase()
                        .split('')
                        .map((c) => 127397 + c.charCodeAt(0)),
                    )}
                  </span>
                ) : (
                  <span className="lcd-dim text-xs">FM</span>
                )}
              </span>

              <span className="min-w-0 flex-1" aria-live="polite">
                <span className="lcd-text block truncate text-sm">
                  {currentStation ? currentStation.name : 'STATIC'}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-2xs">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      isPlaying ? 'led-on bg-signal' : 'bg-white/15'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="lcd-dim uppercase">{status}</span>
                  {freq && <span className="lcd-dim shrink-0">· FM {freq}</span>}
                </span>
              </span>

              <svg
                className={`h-4 w-4 shrink-0 text-ivory-500 transition-transform duration-200 ${
                  expanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            <PlayerControls
              isPlaying={isPlaying}
              loading={loading}
              hasMultipleStations={hasMultipleStations}
              playDisabled={playDisabled}
              onPlayPause={onPlayPause}
              onPrevious={onPrevious}
              onNext={onNext}
              volume={volume}
              onVolumeChange={onVolumeChange}
              size="md"
              showVolume={false}
            />
          </div>
        </div>
      </div>
    </>
  );
}
