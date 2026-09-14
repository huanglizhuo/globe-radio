interface WorldTourToggleProps {
  active?: boolean;
  onToggle?: () => void;
}

/**
 * World tour mode key: hops the globe station to station.
 */
export function WorldTourToggle({ active = false, onToggle }: WorldTourToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={`World tour ${active ? 'on' : 'off'}`}
      className={`relative flex h-10 shrink-0 select-none items-center gap-1.5 rounded-lg px-3 transition-[background-color,transform,color] duration-150 active:translate-y-px ${
        active
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
        <circle cx="12" cy="12" r="9" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"
        />
      </svg>
      <span className="font-display text-2xs font-bold uppercase tracking-[0.14em]">Tour</span>
      {active && (
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-white"
        />
      )}
    </button>
  );
}
