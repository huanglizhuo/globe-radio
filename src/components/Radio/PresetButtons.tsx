import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { RadioPreset } from '../../utils/presets';
import { getFlagEmoji } from './StationInfo';

const HOLD_MS = 500;
const SLOTS = [1, 2, 3, 4, 5, 6] as const;

interface PresetButtonsProps {
  presets?: RadioPreset[];
  disabled?: boolean;
  onSlotActivate?: (slot: number) => void;
  onSlotSave?: (slot: number) => void;
}

/**
 * Physical-receiver preset keys P1–P6. A quick tap activates a stored
 * station; holding the key down for 500ms saves the current station.
 */
export function PresetButtons({
  presets,
  disabled = false,
  onSlotActivate,
  onSlotSave,
}: PresetButtonsProps) {
  const holdTimer = useRef<number | null>(null);
  const holdFired = useRef(false);
  const downAt = useRef(0);

  const clearHold = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  // A held key must never leak its timer past unmount.
  useEffect(
    () => () => {
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    },
    [],
  );

  const handlePointerDown = (slot: number) => {
    if (disabled) return;
    holdFired.current = false;
    downAt.current = Date.now();
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      holdFired.current = true;
      onSlotSave?.(slot);
    }, HOLD_MS);
  };

  const handlePointerUp = (slot: number) => {
    clearHold();
    const fired = holdFired.current;
    holdFired.current = false;
    if (disabled || fired) return;
    if (Date.now() - downAt.current < HOLD_MS) onSlotActivate?.(slot);
  };

  const cancelHold = () => {
    clearHold();
    holdFired.current = false;
  };

  // Keyboard path: activate directly; saving via long-press is pointer-only.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, slot: number) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    // Suppress the browser's synthesized click so activation fires exactly once.
    event.preventDefault();
    if (!disabled) onSlotActivate?.(slot);
  };

  const bySlot = new Map<number, RadioPreset>();
  for (const preset of presets ?? []) bySlot.set(preset.slot, preset);

  return (
    <div role="group" aria-label="Station presets" className="flex gap-1.5">
      {SLOTS.map((slot) => {
        const preset = bySlot.get(slot);
        return (
          <button
            key={slot}
            type="button"
            disabled={disabled}
            onPointerDown={() => handlePointerDown(slot)}
            onPointerUp={() => handlePointerUp(slot)}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            onKeyDown={(e) => handleKeyDown(e, slot)}
            aria-label={
              preset
                ? `Preset ${slot}: ${preset.name}`
                : `Preset ${slot}: empty, hold current station to save`
            }
            className={`flex h-9 min-h-10 min-w-0 select-none flex-1 flex-col items-center justify-center gap-0.5 rounded-md border transition-[background-color,transform,color] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 ${
              preset
                ? 'border-walnut-950 border-t-accent bg-walnut-700 hover:bg-walnut-600'
                : 'border-walnut-950 bg-walnut-700 hover:bg-walnut-600'
            }`}
          >
            {preset ? (
              <>
                <span className="text-sm leading-none" aria-hidden="true">
                  {preset.countrycode ? getFlagEmoji(preset.countrycode) : '📻'}
                </span>
                <span className="font-display text-2xs leading-none text-ivory-500">{slot}</span>
              </>
            ) : (
              <span className="lcd-dim text-2xs leading-none">{slot}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
