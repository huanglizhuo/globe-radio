import { useEffect, useRef, useState } from 'react';
import { generatePassportShareImage, type PassportData } from '../../utils/passport';
import { getFlagEmoji } from '../Radio/StationInfo';

interface PassportPanelProps {
  open: boolean;
  onClose: () => void;
  data?: PassportData;
}

function formatFirstHeard(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

/**
 * Listening passport modal: country stamps collected by tuning in.
 * The parent supplies a fresh getPassport() snapshot when opening.
 */
export function PassportPanel({ open, onClose, data }: PassportPanelProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const stamps = data?.stamps ?? [];
  const hasStamps = stamps.length > 0;

  const handleSaveImage = async () => {
    if (!data || !hasStamps || saving) return;
    setSaving(true);
    try {
      const blob = await generatePassportShareImage(data);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'globe-radio-passport.png';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Rendering failed — keep the dialog open so the stamps stay readable.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Listening passport"
        className="sheet-enter relative flex max-h-[80dvh] w-[92%] max-w-md flex-col overflow-hidden rounded-2xl border border-walnut-950 bg-gradient-to-b from-walnut-800 to-walnut-900 shadow-panel"
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.24em] text-ivory-300">
            Globe Radio Passport
          </h2>
          <p className="lcd-dim mt-1.5 text-2xs">
            {stamps.length} {stamps.length === 1 ? 'country' : 'countries'} ·{' '}
            {data?.totalStations ?? 0} {data?.totalStations === 1 ? 'station' : 'stations'} heard
          </p>

          {hasStamps ? (
            <ul className="mt-4 space-y-1.5" role="list">
              {stamps.map((stamp) => (
                <li
                  key={stamp.countryCode}
                  className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2"
                >
                  <span className="shrink-0 text-base leading-none" aria-hidden="true">
                    {getFlagEmoji(stamp.countryCode)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-2xs font-bold uppercase tracking-[0.1em] text-ivory-300">
                      {stamp.countryName}
                    </p>
                    <p className="mt-0.5 truncate text-2xs text-ivory-500">
                      {formatFirstHeard(stamp.firstHeard)} · {stamp.stationCount}{' '}
                      {stamp.stationCount === 1 ? 'station' : 'stations'} · {stamp.lastStationName}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-center text-sm leading-relaxed text-ivory-500">
              No stamps yet — spin the globe and tune in. Every new country you hear gets a stamp.
            </p>
          )}
        </div>

        <footer className="flex gap-2 border-t border-white/10 bg-walnut-950/40 p-4">
          <button
            type="button"
            onClick={() => void handleSaveImage()}
            disabled={!hasStamps || saving}
            className="h-10 flex-1 rounded-lg border border-ivory-500/40 font-display text-2xs font-bold uppercase tracking-[0.14em] text-ivory-300 transition-colors duration-150 hover:bg-white/10 hover:text-ivory-100 active:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save share image'}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-lg bg-accent font-display text-2xs font-bold uppercase tracking-[0.14em] text-white transition-[background-color,transform] duration-150 hover:bg-accent-hover active:translate-y-px active:bg-accent-press"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
