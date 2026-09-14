import type { RadioStation } from '../../types';

interface StationInfoProps {
  station: RadioStation | null;
  loading: boolean;
  variant?: 'panel' | 'detail';
}

// Stable pseudo-frequency derived from the station uuid, so the readout
// doesn't flicker on every render like Math.random() did.
export function stableFrequency(uuid: string): string {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash * 31 + uuid.charCodeAt(i)) >>> 0;
  }
  const mhz = 87.5 + (hash % 205) / 10; // 87.5 – 107.9
  return mhz.toFixed(1);
}

export function StationInfo({ station, loading, variant = 'panel' }: StationInfoProps) {
  // Skeleton only when there's nothing to show yet; an existing station stays
  // on the readout while loading (the play button carries the loading state).
  if (loading && !station) {
    return (
      <div className={variant === 'panel' ? 'py-2' : 'py-4'}>
        <div className="mx-auto w-3/4 animate-pulse rounded bg-ivory-500/20 py-1.5" />
        <div className="mx-auto mt-2 w-1/2 animate-pulse rounded bg-ivory-500/10 py-1" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className={variant === 'panel' ? 'py-2 text-center' : 'py-4 text-center'}>
        <p className="lcd-text text-sm">STATIC</p>
        <p className="lcd-dim mt-1 text-2xs">SPIN THE GLOBE TO FIND STATIONS</p>
      </div>
    );
  }

  const flag = getFlagEmoji(station.countrycode);
  const freq = stableFrequency(station.stationuuid);
  const meta = [
    station.country,
    station.codec?.toUpperCase(),
    station.bitrate > 0 ? `${station.bitrate} kbps` : null,
  ].filter(Boolean);

  if (variant === 'panel') {
    return (
      <div className="py-1">
        <div className="flex items-center justify-center gap-2">
          {station.countrycode && (
            <span className="shrink-0 text-base leading-none" aria-hidden="true">{flag}</span>
          )}
          <h3 className="lcd-text min-w-0 truncate text-sm font-medium">{station.name}</h3>
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-2 text-2xs">
          <span className="lcd-text shrink-0 rounded border border-ivory-500/25 bg-white/5 px-1.5 py-0.5">
            FM {freq}
          </span>
          <span className="lcd-dim min-w-0 truncate">{meta.join(' · ')}</span>
        </div>
      </div>
    );
  }

  const tags = station.tags
    ?.split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="py-1">
      <div className="flex items-center gap-3">
        {station.countrycode && (
          <span className="shrink-0 text-2xl leading-none" aria-hidden="true">{flag}</span>
        )}
        <h2 className="min-w-0 flex-1 truncate font-display text-xl font-bold text-ivory-100">
          {station.name}
        </h2>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ivory-500">
        {meta.length > 0 && <span className="min-w-0 truncate">{meta.join(' · ')}</span>}
        <span className="lcd-text ml-auto shrink-0 rounded border border-ivory-500/25 bg-white/5 px-2 py-0.5 text-2xs">
          FM {freq}
        </span>
      </div>

      {tags && tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-2xs text-ivory-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to get flag emoji from country code
export function getFlagEmoji(countryCode: string | undefined): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}
