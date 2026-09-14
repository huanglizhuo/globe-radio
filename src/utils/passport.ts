/**
 * "Listening passport": every new country heard earns a stamp.
 * Stored in localStorage under `gr-passport-v1` as
 * `{ version: 1, countries: { CC: { countryName, firstHeard, lastStationName, stations: [uuid...] } }, totalUniqueStations }`.
 */

export interface PassportStamp {
  /** Uppercase ISO-2 code */
  countryCode: string;
  countryName: string;
  /** ISO date-time */
  firstHeard: string;
  /** Distinct stations heard from that country */
  stationCount: number;
  lastStationName: string;
}

export interface PassportData {
  stamps: PassportStamp[];
  totalStations: number;
}

const STORAGE_KEY = 'gr-passport-v1';
const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;
const MAX_FLAGS_ON_SHARE_IMAGE = 24;

interface CountryRecord {
  countryName: string;
  firstHeard: string;
  lastStationName: string;
  stations: string[];
}

interface PassportStorage {
  version: 1;
  countries: Record<string, CountryRecord>;
  totalUniqueStations: number;
}

type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function emptyStorage(): PassportStorage {
  return { version: 1, countries: {}, totalUniqueStations: 0 };
}

function isCountryRecord(value: unknown): value is CountryRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.countryName === 'string' &&
    typeof record.firstHeard === 'string' &&
    typeof record.lastStationName === 'string' &&
    Array.isArray(record.stations)
  );
}

function totalStations(storage: PassportStorage): number {
  let total = 0;
  for (const record of Object.values(storage.countries)) {
    total += record.stations.length;
  }
  return total;
}

function loadStorage(): PassportStorage {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable — treat as empty passport.
    return emptyStorage();
  }
  if (raw === null) {
    return emptyStorage();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyStorage();
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return emptyStorage();
  }
  const root = parsed as Record<string, unknown>;
  if (
    root.version !== 1 ||
    typeof root.countries !== 'object' ||
    root.countries === null
  ) {
    return emptyStorage();
  }

  const countries: Record<string, CountryRecord> = {};
  for (const [code, value] of Object.entries(root.countries)) {
    if (!COUNTRY_CODE_PATTERN.test(code) || !isCountryRecord(value)) {
      continue;
    }
    countries[code.toUpperCase()] = {
      countryName: value.countryName,
      firstHeard: value.firstHeard,
      lastStationName: value.lastStationName,
      stations: value.stations.filter(
        (uuid): uuid is string => typeof uuid === 'string' && uuid.length > 0,
      ),
    };
  }

  const storage = emptyStorage();
  storage.countries = countries;
  storage.totalUniqueStations = totalStations(storage);
  return storage;
}

function persist(storage: PassportStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // Storage unavailable or full — nothing else we can do here.
  }
}

function toPassportData(storage: PassportStorage): PassportData {
  const stamps: PassportStamp[] = Object.entries(storage.countries).map(
    ([countryCode, record]) => ({
      countryCode,
      countryName: record.countryName,
      firstHeard: record.firstHeard,
      stationCount: record.stations.length,
      lastStationName: record.lastStationName,
    }),
  );
  stamps.sort((a, b) => {
    if (a.firstHeard !== b.firstHeard) {
      return a.firstHeard < b.firstHeard ? -1 : 1;
    }
    return a.countryCode < b.countryCode ? -1 : a.countryCode > b.countryCode ? 1 : 0;
  });
  return { stamps, totalStations: totalStations(storage) };
}

/**
 * Current passport state.
 */
export function getPassport(): PassportData {
  return toPassportData(loadStorage());
}

/**
 * Record that a station was heard. Adds a stamp for a new country and/or
 * counts a new distinct station (deduped by stationuuid within the country).
 * No-op returning the current data when countrycode is missing/invalid
 * (or the station has no uuid).
 */
export function recordStationHeard(station: {
  stationuuid: string; name: string; country: string | null; countrycode: string | null;
}): PassportData {
  const code =
    typeof station.countrycode === 'string'
      ? station.countrycode.toUpperCase()
      : '';
  if (!COUNTRY_CODE_PATTERN.test(code) || station.stationuuid.length === 0) {
    return getPassport();
  }

  const storage = loadStorage();
  const countryName =
    typeof station.country === 'string' && station.country.trim().length > 0
      ? station.country.trim()
      : code;
  const record = storage.countries[code];
  if (record) {
    if (!record.stations.includes(station.stationuuid)) {
      record.stations.push(station.stationuuid);
    }
    record.lastStationName = station.name;
    if (typeof station.country === 'string' && station.country.trim().length > 0) {
      record.countryName = countryName;
    }
  } else {
    storage.countries[code] = {
      countryName,
      firstHeard: new Date().toISOString(),
      lastStationName: station.name,
      stations: [station.stationuuid],
    };
  }
  storage.totalUniqueStations = totalStations(storage);
  persist(storage);
  return toPassportData(storage);
}

function countryCodeToFlag(countryCode: string): string {
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return '\u{1F30D}';
  }
  return String.fromCodePoint(
    0x1f1e6 + (countryCode.charCodeAt(0) - 65),
    0x1f1e6 + (countryCode.charCodeAt(1) - 65),
  );
}

function renderPassport(ctx: Ctx2D, data: PassportData, width: number, height: number): void {
  // Deep walnut background with a subtle darker vignette.
  ctx.fillStyle = '#2a1d0c';
  ctx.fillRect(0, 0, width, height);
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, height * 0.25,
    width / 2, height / 2, width * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';

  // Title
  ctx.letterSpacing = '10px';
  ctx.fillStyle = '#f4e8cf';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('GLOBE RADIO PASSPORT', width / 2, 110);

  // Subtitle
  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#d8c9a8';
  ctx.font = '600 44px system-ui';
  ctx.fillText(
    `I've listened to radio from ${data.stamps.length} countries`,
    width / 2,
    185,
  );

  // Flag grid: up to 24 flags, 8 per row.
  ctx.font = '44px serif';
  ctx.textBaseline = 'middle';
  const shown = data.stamps.slice(0, MAX_FLAGS_ON_SHARE_IMAGE);
  const columns = 8;
  const cellWidth = width / columns;
  shown.forEach((stamp, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    ctx.fillText(
      countryCodeToFlag(stamp.countryCode),
      column * cellWidth + cellWidth / 2,
      290 + row * 80,
    );
  });

  if (data.stamps.length > MAX_FLAGS_ON_SHARE_IMAGE) {
    const remaining = data.stamps.length - MAX_FLAGS_ON_SHARE_IMAGE;
    ctx.fillStyle = '#d8c9a8';
    ctx.font = '600 36px system-ui';
    ctx.fillText(`+${remaining} more`, width / 2, 530);
  }

  // Footer
  ctx.fillStyle = '#a89468';
  ctx.font = '28px system-ui';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('gradio.clothpath.com', width / 2, 598);
}

/**
 * Render the passport as a 1200x630 share image (PNG).
 */
export async function generatePassportShareImage(data: PassportData): Promise<Blob> {
  const width = 1200;
  const height = 630;

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D context unavailable for OffscreenCanvas');
    }
    renderPassport(ctx, data, width, height);
    return canvas.convertToBlob({ type: 'image/png' });
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D context unavailable for canvas');
  }
  renderPassport(ctx, data, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('canvas.toBlob failed'));
      }
    }, 'image/png');
  });
}
