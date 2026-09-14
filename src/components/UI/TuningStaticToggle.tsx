interface TuningStaticToggleProps {
  enabled?: boolean;
  onToggle?: () => void;
}

/**
 * Tuning static key: plays radio-noise crackle while tuning between stations.
 */
export function TuningStaticToggle({ enabled = false, onToggle }: TuningStaticToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={`Tuning static ${enabled ? 'on' : 'off'}`}
      className={`relative flex h-10 shrink-0 select-none items-center gap-1.5 rounded-lg px-3 transition-[background-color,transform,color] duration-150 active:translate-y-px ${
        enabled
          ? 'bg-accent text-white hover:bg-accent-hover active:bg-accent-press'
          : 'bg-walnut-700 text-ivory-300 hover:bg-walnut-600 hover:text-ivory-100 active:bg-walnut-950'
      }`}
    >
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" d="M5 10v4M12 6v12M19 9v6" />
      </svg>
      <span className="font-display text-2xs font-bold uppercase tracking-[0.14em]">Static</span>
      {enabled && (
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-white"
        />
      )}
    </button>
  );
}
