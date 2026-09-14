import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

const FM_MIN = 87.5;
const FM_MAX = 108;
const FM_SPAN = FM_MAX - FM_MIN; // 20.5 MHz
const KEY_STEP = 0.2;
const KEY_COMMIT_MS = 200;
const TICKS = 9;

interface TuningDialProps {
  frequency?: number | null;
  markers?: number[];
  disabled?: boolean;
  onTune?: (freq: number) => void;
}

function clampFreq(freq: number): number {
  return Math.round(Math.min(FM_MAX, Math.max(FM_MIN, freq)) * 10) / 10;
}

function percentOf(freq: number): number {
  return ((freq - FM_MIN) / FM_SPAN) * 100;
}

/**
 * FM band dial (87.5–108) with a glowing red needle. Drag to scrub the
 * band, release to tune to the nearest station; arrow keys nudge ±0.2 MHz.
 */
export function TuningDial({
  frequency = null,
  markers = [],
  disabled = false,
  onTune,
}: TuningDialProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const commitTimer = useRef<number | null>(null);
  // Local override while dragging or arrowing; null = follow the committed prop.
  const [liveFreq, setLiveFreq] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Re-sync whenever the committed frequency changes (or settles).
  useEffect(() => {
    setLiveFreq(null);
  }, [frequency]);

  useEffect(
    () => () => {
      if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
    },
    [],
  );

  const displayFreq = liveFreq ?? frequency;

  const freqFromClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return FM_MIN;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return FM_MIN;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return clampFreq(FM_MIN + ratio * FM_SPAN);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    try {
      trackRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // Pointer already released — drag simply ends early.
    }
    setDragging(true);
    setLiveFreq(freqFromClientX(event.clientX));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || !dragging) return;
    event.preventDefault();
    setLiveFreq(freqFromClientX(event.clientX));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || !dragging) return;
    const freq = freqFromClientX(event.clientX);
    setDragging(false);
    setLiveFreq(null);
    onTune?.(freq);
  };

  const cancelDrag = () => {
    if (!dragging) return;
    setDragging(false);
    setLiveFreq(null);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const base = displayFreq ?? FM_MIN;
    let next: number;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = clampFreq(base - KEY_STEP);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = clampFreq(base + KEY_STEP);
        break;
      case 'Home':
        next = FM_MIN;
        break;
      case 'End':
        next = FM_MAX;
        break;
      default:
        return;
    }
    event.preventDefault();
    setLiveFreq(next);
    // Debounce commits so holding an arrow doesn't spam station changes.
    if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => {
      commitTimer.current = null;
      onTune?.(next);
    }, KEY_COMMIT_MS);
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Tuning dial, frequency in megahertz"
      aria-orientation="horizontal"
      aria-valuemin={FM_MIN}
      aria-valuemax={FM_MAX}
      aria-valuenow={displayFreq ?? undefined}
      aria-valuetext={displayFreq != null ? `${displayFreq.toFixed(1)} MHz` : undefined}
      aria-disabled={disabled || frequency == null}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={cancelDrag}
      onKeyDown={handleKeyDown}
      className={`lcd-window relative h-11 touch-none select-none overflow-hidden rounded-md border border-walnut-950 ${
        disabled ? 'cursor-default opacity-40' : 'cursor-ew-resize'
      }`}
    >
      {/* Scale ticks */}
      {Array.from({ length: TICKS }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute bottom-0.5 top-2 w-px bg-white/20"
          style={{ left: `${((i + 1) / (TICKS + 1)) * 100}%` }}
        />
      ))}

      {/* Station markers */}
      {markers.map((freq, i) => {
        if (freq < FM_MIN || freq > FM_MAX) return null;
        return (
          <span
            key={i}
            aria-hidden="true"
            className="absolute bottom-0.5 top-1 w-0.5 bg-white/50"
            style={{ left: `${percentOf(freq)}%` }}
          />
        );
      })}

      {/* Band edge labels */}
      <span aria-hidden="true" className="lcd-dim absolute bottom-0 left-1.5 text-2xs leading-none">
        87.5
      </span>
      <span aria-hidden="true" className="lcd-dim absolute bottom-0 right-1.5 text-2xs leading-none">
        108
      </span>

      {/* Needle */}
      {displayFreq != null && (
        <span
          aria-hidden="true"
          className="absolute bottom-1 top-1 w-0.5 rounded-full bg-accent"
          style={{
            left: `${percentOf(displayFreq)}%`,
            boxShadow: '0 0 6px var(--color-accent)',
            transition: dragging ? 'none' : 'left 150ms ease-out',
          }}
        />
      )}
    </div>
  );
}
