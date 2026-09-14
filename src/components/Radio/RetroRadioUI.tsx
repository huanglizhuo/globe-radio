import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { RadioStation } from '../../types';
import type { RadioPreset } from '../../utils/presets';
import { getLocalTimeInfo, type LocalTimeInfo } from '../../utils/solarTime';
import { StationInfo, stableFrequency } from './StationInfo';
import { StationList } from './StationList';
import { PlayerControls } from './PlayerControls';
import { PresetButtons } from './PresetButtons';
import { TuningDial } from './TuningDial';
import { SignalMeter } from './SignalMeter';
import { SleepTimerControl } from './SleepTimerControl';
import { WorldTourToggle } from '../UI/WorldTourToggle';
import { TuningStaticToggle } from '../UI/TuningStaticToggle';

type SignalQuality = 'strong' | 'weak' | 'none';

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
  /* ---- Optional extensions (wired by App; all safe to omit) ---- */
  signal?: SignalQuality;
  hasRealtimeLevels?: boolean;
  getLevels?: () => number[] | null;
  sleepMinutes?: number | null;
  sleepRemainingSec?: number | null;
  onSetSleepTimer?: (minutes: number | null) => void;
  presets?: RadioPreset[];
  onPresetActivate?: (slot: number) => void;
  onPresetSave?: (slot: number) => void;
  worldTourActive?: boolean;
  onToggleWorldTour?: () => void;
  onOpenPassport?: () => void;
  passportCountryCount?: number;
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

/** LCD corner row: local solar time at the station + signal strength. */
function LcdStatusRow({
  localTime,
  signal,
}: {
  localTime: LocalTimeInfo | null;
  signal: SignalQuality;
}) {
  return (
    <div className="mt-2 flex items-end justify-between gap-2">
      {localTime ? (
        <span className="lcd-dim text-2xs" title={localTime.phase}>
          <span aria-hidden="true">{localTime.phaseIcon}</span> {localTime.label}
        </span>
      ) : (
        <span aria-hidden="true" />
      )}
      <SignalMeter signal={signal} />
    </div>
  );
}

const GRILL_DOTS = 36;
const GRILL_DOT_CLASSES = ['bg-walnut-700', 'bg-walnut-800', 'bg-walnut-900'] as const;

/**
 * Speaker grill that doubles as an equalizer while playing. Dots are driven
 * via refs inside one rAF loop — no per-frame React renders. Falls back to a
 * synthetic wave when the analyser is unavailable, and stays static when
 * reduced motion is preferred.
 */
function GrillEQ({ isPlaying, getLevels }: { isPlaying: boolean; getLevels?: () => number[] | null }) {
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const dots = dotRefs.current.filter((el): el is HTMLDivElement => el !== null);
    const restore = () => {
      for (const dot of dots) {
        dot.style.opacity = '';
        dot.style.backgroundColor = '';
      }
    };

    // The grill only exists in the desktop panel; on mobile the loop would
    // spin invisibly. Re-evaluates whenever the play state changes.
    const desktop = window.matchMedia('(min-width: 768px)').matches;
    if (
      !isPlaying ||
      !desktop ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      restore();
      return;
    }

    let raf = 0;
    const tick = (t: number) => {
      const levels = getLevels?.() ?? null;
      for (let i = 0; i < dots.length; i++) {
        const intensity =
          levels !== null
            ? // Realtime band level with a per-dot shimmer so the grill breathes.
              Math.min(
                1,
                Math.max(
                  0,
                  (levels[Math.floor((i / GRILL_DOTS) * levels.length)] ?? 0) * 0.85 +
                    0.15 * Math.sin(t / 450 + i * 1.7),
                ),
              )
            : // Synthetic idle groove.
              Math.min(
                1,
                Math.max(0, 0.3 + 0.25 * Math.sin(t / 700 + i * 0.9) + 0.2 * Math.sin(t / 1300 + i * 2.3)),
              );
        dots[i].style.opacity = String(0.35 + 0.65 * intensity);
        dots[i].style.backgroundColor = intensity > 0.55 ? 'var(--color-signal)' : '';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      restore();
    };
  }, [isPlaying, getLevels]);

  return (
    <div className="mb-3 rounded-lg bg-gradient-to-b from-walnut-950 to-walnut-900 p-2.5" aria-hidden="true">
      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: GRILL_DOTS }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            className={`h-2 w-2 rounded-full ${GRILL_DOT_CLASSES[i % 3]}`}
          />
        ))}
      </div>
    </div>
  );
}

/** Passport key with a country-count badge; opens the passport dialog. */
function PassportButton({
  countryCount,
  onOpen,
}: {
  countryCount?: number;
  onOpen?: () => void;
}) {
  const count = countryCount != null && countryCount > 0 ? countryCount : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={count > 0 ? `Open listening passport, ${count} countries` : 'Open listening passport'}
      className="relative flex h-10 shrink-0 select-none items-center gap-1.5 rounded-lg bg-walnut-700 px-3 text-ivory-300 transition-[background-color,transform,color] duration-150 hover:bg-walnut-600 hover:text-ivory-100 active:translate-y-px active:bg-walnut-950"
    >
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3l7 4v5c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V7l7-4z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12l1.8 1.8 3.2-3.6" />
      </svg>
      <span className="font-display text-2xs font-bold uppercase tracking-[0.14em]">Passport</span>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-display text-2xs font-bold leading-none text-white"
        >
          {count}
        </span>
      )}
    </button>
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
  tuningEffectEnabled,
  onPlayPause,
  onPrevious,
  onNext,
  onVolumeChange,
  onToggleTuningEffect,
  onRetry,
  onSelectStation,
  signal = 'none',
  hasRealtimeLevels,
  getLevels,
  sleepMinutes = null,
  sleepRemainingSec = null,
  onSetSleepTimer,
  presets,
  onPresetActivate,
  onPresetSave,
  worldTourActive = false,
  onToggleWorldTour,
  onOpenPassport,
  passportCountryCount,
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

  // Approximate local time at the tuned location, refreshed every 30s.
  const stationLat = currentStation?.geo_lat ?? null;
  const stationLon = currentStation?.geo_long ?? null;
  const [localTime, setLocalTime] = useState<LocalTimeInfo | null>(null);
  useEffect(() => {
    if (stationLat == null || stationLon == null) {
      setLocalTime(null);
      return;
    }
    const compute = () => setLocalTime(getLocalTimeInfo(stationLat, stationLon));
    compute();
    const id = window.setInterval(compute, 30_000);
    return () => window.clearInterval(id);
  }, [stationLat, stationLon]);

  const freq = currentStation ? stableFrequency(currentStation.stationuuid) : null;
  const freqNum = freq != null ? parseFloat(freq) : null;
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

  // Tuning the dial snaps to whichever station is nearest on the FM band
  // (first one wins a tie) and selects it through the existing path.
  const handleTune = (targetFreq: number) => {
    let bestIndex = -1;
    let bestDistance = Infinity;
    stations.forEach((station, index) => {
      const distance = Math.abs(parseFloat(stableFrequency(station.stationuuid)) - targetFreq);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0) onSelectStation(stations[bestIndex].stationuuid);
  };

  const stationMarkers = stations.map((station) => parseFloat(stableFrequency(station.stationuuid)));

  const settingsRow = (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <WorldTourToggle active={worldTourActive} onToggle={onToggleWorldTour} />
      <TuningStaticToggle enabled={tuningEffectEnabled} onToggle={onToggleTuningEffect} />
      <SleepTimerControl
        minutes={sleepMinutes}
        remainingSec={sleepRemainingSec}
        onChange={onSetSleepTimer}
      />
      <PassportButton countryCount={passportCountryCount} onOpen={onOpenPassport} />
    </div>
  );

  const presetsRow = (
    <div className="mt-3">
      <PresetButtons
        presets={presets}
        onSlotActivate={onPresetActivate}
        onSlotSave={onPresetSave}
      />
    </div>
  );

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

        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
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

          {/* Speaker grill / equalizer */}
          <GrillEQ isPlaying={isPlaying} getLevels={hasRealtimeLevels === false ? undefined : getLevels} />

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
            <LcdStatusRow localTime={localTime} signal={signal} />
          </div>

          {/* Tuning dial */}
          <div className="mb-3">
            <TuningDial
              frequency={freqNum}
              markers={stationMarkers}
              disabled={!currentStation}
              onTune={handleTune}
            />
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

          {/* Preset keys */}
          {presetsRow}

          {/* Settings keys */}
          {settingsRow}

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
        </div>
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
                <LcdStatusRow localTime={localTime} signal={signal} />
              </div>

              {/* Tuning dial */}
              <div className="mb-3">
                <TuningDial
                  frequency={freqNum}
                  markers={stationMarkers}
                  disabled={!currentStation}
                  onTune={handleTune}
                />
              </div>

              <VolumeRow volume={volume} onVolumeChange={onVolumeChange} />

              {/* Preset keys */}
              {presetsRow}

              {/* Settings keys */}
              {settingsRow}

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
