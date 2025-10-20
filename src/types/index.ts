// Radio Station types
export interface RadioStation {
  changeuuid: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  iso_3166_2?: string;
  state: string;
  language: string;
  languagecodes?: string;
  votes: number;
  lastchangetime?: string;
  lastchangetime_iso8601?: string;
  codec: string;
  bitrate: number;
  hls?: number;
  lastcheckok?: number;
  lastchecktime?: string;
  lastchecktime_iso8601?: string;
  lastcheckoktime?: string;
  lastcheckoktime_iso8601?: string;
  lastlocalchecktime?: string;
  lastlocalchecktime_iso8601?: string;
  clickcount: number;
  clicktrend: number;
  ssl_error?: number;
  geo_lat: number | null;
  geo_long: number | null;
}

// Coordinates types
export interface Coordinates {
  lat: number;
  lon: number;
}

export interface GlobePosition {
  x: number;
  y: number;
  z: number;
}

// Player state
export interface PlayerState {
  isPlaying: boolean;
  currentStation: RadioStation | null;
  stations: RadioStation[];
  currentIndex: number;
  volume: number;
  loading: boolean;
  error: string | null;
}

// API Response
export interface RadioBrowserResponse {
  ok: boolean;
  message: string;
  stations?: RadioStation[];
}
