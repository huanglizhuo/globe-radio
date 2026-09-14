/**
 * Radio preset slots (P1-P6), like the preset buttons on a physical receiver.
 * Stored in localStorage under `gr-presets-v1`.
 */

export interface RadioPreset {
  /** Preset slot number, 1..6 */
  slot: number;
  stationuuid: string;
  name: string;
  countrycode: string | null;
  lat: number | null;
  lon: number | null;
}

const STORAGE_KEY = 'gr-presets-v1';
const MIN_SLOT = 1;
const MAX_SLOT = 6;

function isValidSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= MIN_SLOT && slot <= MAX_SLOT;
}

function isValidPreset(value: unknown): value is RadioPreset {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const preset = value as Record<string, unknown>;
  return (
    typeof preset.slot === 'number' &&
    isValidSlot(preset.slot) &&
    typeof preset.stationuuid === 'string' &&
    typeof preset.name === 'string' &&
    (typeof preset.countrycode === 'string' || preset.countrycode === null) &&
    (typeof preset.lat === 'number' || preset.lat === null) &&
    (typeof preset.lon === 'number' || preset.lon === null)
  );
}

/**
 * Read presets from localStorage.
 * Tolerant of missing or corrupt data (returns []), invalid entries, and
 * duplicates; always clamps the result to slots 1..6 (max 6 entries).
 */
export function loadPresets(): RadioPreset[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (e.g. blocked storage) — treat as empty.
    return [];
  }
  if (raw === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  const bySlot = new Map<number, RadioPreset>();
  for (const entry of parsed) {
    if (isValidPreset(entry) && !bySlot.has(entry.slot)) {
      bySlot.set(entry.slot, entry);
    }
  }
  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}

function persist(presets: RadioPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Storage unavailable or full — nothing else we can do here.
  }
}

/**
 * Save a station to a preset slot. Invalid slots (outside 1..6) are ignored.
 * Persists immediately.
 */
export function savePreset(slot: number, station: {
  stationuuid: string; name: string; countrycode: string | null;
  geo_lat: number | null; geo_long: number | null;
}): void {
  if (!isValidSlot(slot)) {
    return;
  }
  const presets = loadPresets().filter((preset) => preset.slot !== slot);
  presets.push({
    slot,
    stationuuid: station.stationuuid,
    name: station.name,
    countrycode: station.countrycode,
    lat: station.geo_lat,
    lon: station.geo_long,
  });
  presets.sort((a, b) => a.slot - b.slot);
  persist(presets);
}

/**
 * Remove the preset stored in a slot (no-op if the slot is empty or invalid).
 * Persists immediately.
 */
export function clearPreset(slot: number): void {
  persist(loadPresets().filter((preset) => preset.slot !== slot));
}
