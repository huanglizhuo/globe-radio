interface SleepTimerControlProps {
  minutes?: number | null;
  remainingSec?: number | null;
  onChange?: (minutes: number | null) => void;
}

const CYCLE: readonly number[] = [15, 30, 60];

function formatCountdown(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Sleep timer key: off → 15 → 30 → 60 → off. While armed the label
 * becomes a mm:ss countdown.
 */
export function SleepTimerControl({
  minutes = null,
  remainingSec = null,
  onChange,
}: SleepTimerControlProps) {
  const active = minutes != null && minutes > 0;
  const countdown = formatCountdown(remainingSec ?? (minutes ?? 0) * 60);

  const handleClick = () => {
    const index = CYCLE.findIndex((m) => m === minutes);
    // off → 15 → 30 → 60 → off
    const next = index === -1 ? CYCLE[0] : index === CYCLE.length - 1 ? null : CYCLE[index + 1];
    onChange?.(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={
        active ? `Sleep timer ${minutes} minutes, ${countdown} left` : 'Sleep timer off'
      }
      className="flex h-10 shrink-0 select-none items-center gap-1.5 rounded-lg bg-walnut-700 px-3 text-ivory-300 transition-[background-color,transform,color] duration-150 hover:bg-walnut-600 hover:text-ivory-100 active:translate-y-px active:bg-walnut-950"
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
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
      {active ? (
        <span className="lcd-dim min-w-[2.6em] text-2xs tabular-nums">{countdown}</span>
      ) : (
        <span className="font-display text-2xs font-bold uppercase tracking-[0.14em]">Sleep</span>
      )}
    </button>
  );
}
