import type { RadioStation } from '../../types';

interface StationInfoProps {
  station: RadioStation | null;
  loading: boolean;
  compact?: boolean;
}

export function StationInfo({ station, loading, compact = false }: StationInfoProps) {
  // Only show loading skeleton if there's no station yet
  // If station exists, keep showing it even during loading (play button will show loading)
  if (loading && !station) {
    return (
      <div className={`text-center ${compact ? 'py-2' : 'py-4'}`}>
        <div className="animate-pulse">
          <div className={`h-3 bg-amber-700 rounded w-3/4 mx-auto mb-1 ${compact ? '' : 'mb-2'}`} />
          {!compact && <div className="h-2 bg-amber-700 rounded w-1/2 mx-auto" />}
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className={`text-center ${compact ? 'py-2' : 'py-4'} ${compact ? 'text-amber-600' : 'text-gray-400'}`}>
        <p className={compact ? 'text-xs' : ''}>{compact ? '📻 No Signal' : 'No station available'}</p>
        {!compact && <p className="text-xs mt-1">Rotate the globe to find stations</p>}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="text-center py-2 px-2">
        {/* Station name - compact */}
        <h3 className="text-sm font-bold text-amber-100 truncate leading-tight">{station.name}</h3>

        {/* Country flag */}
        {station.country && (
          <div className="text-xs text-amber-600 mt-1">
            <span className="text-xs mr-1">{getFlagEmoji(station.countrycode)}</span>
            {station.country}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-4 px-6">
      {/* Station name */}
      <h2 className="text-2xl font-bold text-white mb-2 truncate">{station.name}</h2>

      {/* Station details */}
      <div className="flex items-center justify-center gap-3 text-sm text-gray-300 mb-2">
        {station.country && (
          <span className="flex items-center gap-1">
            <span className="text-lg">{getFlagEmoji(station.countrycode)}</span>
            {station.country}
          </span>
        )}
        {station.codec && <span className="uppercase">{station.codec}</span>}
        {station.bitrate > 0 && <span>{station.bitrate} kbps</span>}
      </div>

      {/* Tags */}
      {station.tags && (
        <div className="flex flex-wrap justify-center gap-1 mt-2">
          {station.tags
            .split(',')
            .filter((tag) => tag.trim())
            .slice(0, 3)
            .map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-700 rounded-full text-xs text-gray-300"
              >
                {tag.trim()}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}
