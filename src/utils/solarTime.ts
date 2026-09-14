/**
 * Approximate local solar time and day/night phase from coordinates.
 *
 * This is a deterministic, pure approximation — no timezone APIs:
 * local time = UTC + Math.round(lon / 15) hours, i.e. the location's
 * mean-solar offset from the Greenwich meridian. Civil time can differ
 * by up to ~1h from this (timezone borders, DST), which is acceptable
 * for a "what time is it there?" readout.
 */

export type DayPhase = 'day' | 'twilight' | 'night';

export interface LocalTimeInfo {
  /** 24h "HH:MM" local solar-ish time */
  label: string;
  phase: DayPhase;
  phaseIcon: string;
}

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Get approximate local time and day/night phase for a coordinate.
 * @param lat - latitude in degrees
 * @param lon - longitude in degrees
 * @param date - optional instant to evaluate (defaults to now)
 */
export function getLocalTimeInfo(lat: number, lon: number, date?: Date): LocalTimeInfo {
  const at = date ?? new Date();

  // Approximate local solar time via a fixed longitude offset.
  const offsetHours = Math.round(lon / 15);
  const local = new Date(at.getTime() + offsetHours * MS_PER_HOUR);
  const hours = local.getUTCHours();
  const minutes = local.getUTCMinutes();
  const label = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // Day of year (Jan 1 = 1), UTC-based for determinism.
  const year = at.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const dayOfYear =
    Math.floor((Date.UTC(year, at.getUTCMonth(), at.getUTCDate()) - yearStart) / MS_PER_DAY) + 1;

  // Solar declination in degrees (standard approximation).
  const declinationDeg = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);

  // Hour angle in degrees: 0 at solar noon, 15 degrees per hour.
  const secondsOfDay = hours * 3600 + minutes * 60 + local.getUTCSeconds();
  const solarHours = secondsOfDay / 3600;
  const hourAngleDeg = (solarHours - 12) * 15;

  // Solar elevation: asin(sin lat * sin decl + cos lat * cos decl * cos H).
  const toRadians = Math.PI / 180;
  const sinElevation =
    Math.sin(lat * toRadians) * Math.sin(declinationDeg * toRadians) +
    Math.cos(lat * toRadians) *
      Math.cos(declinationDeg * toRadians) *
      Math.cos(hourAngleDeg * toRadians);
  // Clamp guards against floating-point drift outside asin's domain.
  const elevationDeg =
    Math.asin(Math.max(-1, Math.min(1, sinElevation))) / toRadians;

  const phase: DayPhase =
    elevationDeg > 0 ? 'day' : elevationDeg > -6 ? 'twilight' : 'night';
  const phaseIcon = phase === 'day' ? '\u2600\uFE0F' : phase === 'twilight' ? '\u{1F307}' : '\u{1F319}';
  return { label, phase, phaseIcon };
}
