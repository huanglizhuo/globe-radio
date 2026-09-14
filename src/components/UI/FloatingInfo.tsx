import { useEffect, useRef, useState } from 'react';

export function FloatingInfo() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Escape + click-outside close the popover
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const toggleOpen = (next: boolean) => {
    setOpen(next);
    if (next) {
      // Only one overlay at a time: ask the mobile station sheet to yield
      window.dispatchEvent(new CustomEvent('gr:close-station-sheet'));
    }
  };

  return (
    <div
      ref={rootRef}
      className="fixed right-3 top-3 z-10 md:bottom-4 md:left-3 md:right-auto md:top-auto"
    >
      {open && (
        <div
          className="popover-enter absolute right-0 top-14 w-72 rounded-xl border border-white/10 bg-veil-chip p-4 shadow-panel backdrop-blur-md md:bottom-14 md:left-0 md:right-auto md:top-auto"
          role="dialog"
          aria-label="About Globe Radio"
        >
          <h2 className="font-display text-xs font-extrabold uppercase tracking-[0.2em] text-ivory-300">
            Globe Radio
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ivory-300">
            Spin the globe — the crosshair tunes into radio stations near wherever it lands.
          </p>

          {/* Keyboard shortcuts (pointer devices only) */}
          <div className="mt-4 hidden md:block">
            <h3 className="font-display text-2xs font-bold uppercase tracking-[0.16em] text-ivory-500">
              Shortcuts
            </h3>
            <ul className="mt-2 space-y-1.5">
              <li className="flex items-center justify-between gap-3">
                <kbd>Space</kbd>
                <span className="text-xs text-ivory-300">Play / pause</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="flex gap-1">
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                </span>
                <span className="text-xs text-ivory-300">Previous / next station</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <kbd>Enter</kbd>
                <span className="text-xs text-ivory-300">Jump to a random city</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <kbd>1–6</kbd>
                <span className="text-xs text-ivory-300">Recall / hold to save preset</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <kbd>T</kbd>
                <span className="text-xs text-ivory-300">Toggle world tour</span>
              </li>
            </ul>
          </div>

          {/* Touch hints (mobile) */}
          <div className="mt-4 md:hidden">
            <h3 className="font-display text-2xs font-bold uppercase tracking-[0.16em] text-ivory-500">
              Gestures
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-ivory-300">
              <li>Drag to spin the globe</li>
              <li>Pinch to zoom</li>
              <li>Tap a green dot to play that station</li>
            </ul>
          </div>
        </div>
      )}

      <button
        onClick={() => toggleOpen(!open)}
        aria-expanded={open}
        aria-label="About Globe Radio and shortcuts"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-veil-control text-ivory-300 shadow-panel backdrop-blur-md transition-colors duration-150 hover:bg-veil-control-hover hover:text-ivory-100 active:bg-walnut-950"
      >
        <svg
          className={`h-5 w-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.5 8.5a3.5 3.5 0 117 0c0 1.5-1 2.5-2 3-1 .5-1.5 1-1.5 2v.5" />
          <circle cx="12" cy="17.5" r="0.5" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
