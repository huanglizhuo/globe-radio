import type { RadioStation } from '../../types';
import { getFlagEmoji, stableFrequency } from './StationInfo';

interface StationListProps {
  stations: RadioStation[];
  currentStationUuid?: string | null;
  onSelect: (stationUuid: string) => void;
}

/**
 * Real DOM list of the stations near the crosshair. The map markers are
 * canvas-drawn and unreachable by keyboard or screen reader — this list is
 * the accessible path to selecting a station.
 */
export function StationList({ stations, currentStationUuid, onSelect }: StationListProps) {
  if (stations.length === 0) return null;

  return (
    <nav aria-label="Stations near the crosshair">
      <h3 className="mb-1.5 flex items-center justify-between font-display text-2xs font-bold uppercase tracking-[0.16em] text-ivory-500">
        <span>Stations here</span>
        <span className="lcd-dim">{stations.length}</span>
      </h3>
      <ul className="max-h-44 overflow-y-auto pr-1" role="list">
        {stations.map((station) => {
          const isCurrent = station.stationuuid === currentStationUuid;
          return (
            <li key={station.stationuuid}>
              <button
                onClick={() => onSelect(station.stationuuid)}
                aria-current={isCurrent ? 'true' : undefined}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ${
                  isCurrent
                    ? 'bg-white/10'
                    : 'hover:bg-white/5 active:bg-white/10'
                }`}
              >
                <span className="shrink-0 text-sm leading-none" aria-hidden="true">
                  {station.countrycode ? getFlagEmoji(station.countrycode) : '🌍'}
                </span>
                <span className="lcd-text min-w-0 flex-1 truncate text-xs">{station.name}</span>
                <span className="lcd-dim shrink-0 text-2xs">
                  FM {stableFrequency(station.stationuuid)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
