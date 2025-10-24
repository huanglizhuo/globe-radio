import type { RadioStation, Coordinates } from '../types';
import { calculateDistance } from '../utils/coordinates';
import { MOCK_STATIONS } from './mockStations';

// Cache for reverse geocoding results to avoid repeated API calls
const geocodeCache = new Map<string, string | null>();

// List of Radio Browser API servers to try
const API_SERVERS = [
  'https://fi1.api.radio-browser.info/json',
  'https://de1.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
  'https://at1.api.radio-browser.info/json',
  'https://fr1.api.radio-browser.info/json',
];

let currentServerIndex = 0;

// Get current API base URL
const getAPIBaseURL = () => API_SERVERS[currentServerIndex];

// Try next server on failure
const switchToNextServer = () => {
  currentServerIndex = (currentServerIndex + 1) % API_SERVERS.length;
  console.log(`Switching to API server: ${getAPIBaseURL()}`);
};

// Helper function to create fetch options with proper headers
const getFetchOptions = (): RequestInit => ({
  method: 'GET',
  headers: {
    'User-Agent': 'GlobeRadio/1.0',
  },
});

// Helper to fetch with retry
async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const fullUrl = `${getAPIBaseURL()}${url}`;
      const response = await fetch(fullUrl, getFetchOptions());

      if (response.ok) {
        return response;
      }

      // If server error, try next server
      if (response.status >= 500) {
        switchToNextServer();
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      switchToNextServer();

      if (attempt < maxRetries - 1) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error('Failed to fetch');
}

export class RadioBrowserAPI {
  // Helper: Shuffle array randomly (Fisher-Yates algorithm)
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Search stations by geo coordinates - single country only
  static async searchByGeo(coordinates: Coordinates, limit: number = 20): Promise<RadioStation[]> {
    try {
      // Try API-based reverse geocoding first
      let countryCode = await this.getCountryCodeFromAPI(coordinates);

      // Fallback to hardcoded regions if API fails
      if (!countryCode) {
        console.log('API geocoding failed, using fallback method...');
        countryCode = this.getCountryCodeFromCoordinates(coordinates);
      }

      if (!countryCode) {
        console.warn('No country detected for coordinates:', coordinates);
        return [];
      }

      console.log(`Searching stations in country: ${countryCode}`);

      // Fetch stations from the detected country only
      const countryStations = await this.searchByCountry(countryCode, 200);

      if (countryStations.length === 0) {
        console.warn(`No stations found for ${countryCode}`);
        return [];
      }

      // Shuffle all stations for variety
      const shuffledStations = this.shuffleArray(countryStations);

      // Take the first 'limit' stations
      const selectedStations = shuffledStations.slice(0, limit);

      console.log(`Found ${countryStations.length} stations in ${countryCode}, returning ${selectedStations.length} randomly shuffled`);

      return selectedStations;
    } catch (error) {
      console.error('Geo search failed:', error);
      return [];
    }
  }

  // Search stations by country code
  static async searchByCountry(countryCode: string, limit: number = 10): Promise<RadioStation[]> {
    try {
      const response = await fetchWithRetry(
        `/stations/bycountrycodeexact/${countryCode}?limit=${limit}&order=votes&reverse=true`
      );

      return await response.json();
    } catch (error) {
      console.error('Error fetching stations by country:', error);
      return [];
    }
  }

  // Get popular stations as fallback
  static async getPopularStations(limit: number = 10): Promise<RadioStation[]> {
    try {
      const response = await fetchWithRetry(
        `/stations/search?limit=${limit}&order=votes&reverse=true&has_geo_info=true`
      );

      return await response.json();
    } catch (error) {
      console.warn('API unavailable, using mock stations:', error);
      // Return mock stations when API is unavailable
      return MOCK_STATIONS.slice(0, limit);
    }
  }

  // Get all stations with geographic information (for global map display)
  static async getAllStationsWithGeo(limit: number = 10000): Promise<RadioStation[]> {
    try {
      console.log(`🌍 Fetching up to ${limit} stations with geographic data...`);

      const response = await fetchWithRetry(
        `/stations/search?limit=${limit}&order=votes&reverse=true&has_geo_info=true&hidebroken=true`
      );

      const stations = await response.json();
      console.log(`✅ Loaded ${stations.length} stations with geo coordinates`);

      return stations;
    } catch (error) {
      console.error('Error fetching all stations:', error);
      // Return empty array on error - map will show no markers
      return [];
    }
  }

  // Search stations by name
  static async searchByName(name: string, limit: number = 20): Promise<RadioStation[]> {
    try {
      const encodedName = encodeURIComponent(name);
      const response = await fetchWithRetry(
        `/stations/search?name=${encodedName}&limit=${limit}&order=votes&reverse=true`
      );

      return await response.json();
    } catch (error) {
      console.error('Error searching stations by name:', error);
      return [];
    }
  }

  // Search stations by tag
  static async searchByTag(tag: string, limit: number = 20): Promise<RadioStation[]> {
    try {
      const encodedTag = encodeURIComponent(tag);
      const response = await fetchWithRetry(
        `/stations/search?tag=${encodedTag}&limit=${limit}&order=votes&reverse=true`
      );

      return await response.json();
    } catch (error) {
      console.error('Error searching stations by tag:', error);
      return [];
    }
  }

  // Advanced search with multiple parameters
  static async advancedSearch(params: {
    name?: string;
    country?: string;
    language?: string;
    tag?: string;
    limit?: number;
  }): Promise<RadioStation[]> {
    try {
      const queryParams = new URLSearchParams();

      if (params.name) queryParams.set('name', params.name);
      if (params.country) queryParams.set('country', params.country);
      if (params.language) queryParams.set('language', params.language);
      if (params.tag) queryParams.set('tag', params.tag);
      queryParams.set('limit', (params.limit || 20).toString());
      queryParams.set('order', 'votes');
      queryParams.set('reverse', 'true');

      const response = await fetchWithRetry(`/stations/search?${queryParams.toString()}`);

      return await response.json();
    } catch (error) {
      console.error('Error in advanced search:', error);
      return [];
    }
  }

  // Get all available tags
  static async getTags(limit: number = 100): Promise<string[]> {
    try {
      const response = await fetchWithRetry(`/tags?limit=${limit}&order=stationcount&reverse=true`);
      const tags = await response.json();
      return tags.map((tag: { name: string }) => tag.name);
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  }

  // Get all available countries
  static async getCountries(): Promise<Array<{ name: string; code: string; count: number }>> {
    try {
      const response = await fetchWithRetry('/countries?order=stationcount&reverse=true');
      const countries = await response.json();
      return countries.map((country: { name: string; stationcount: number; iso_3166_1: string }) => ({
        name: country.name,
        code: country.iso_3166_1,
        count: country.stationcount,
      }));
    } catch (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
  }

  // Helper: Get country code using reverse geocoding API
  private static async getCountryCodeFromAPI(coordinates: Coordinates): Promise<string | null> {
    try {
      const { lat, lon } = coordinates;

      // Create cache key
      const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

      // Check cache first
      if (geocodeCache.has(cacheKey)) {
        return geocodeCache.get(cacheKey) || null;
      }

      // Use OpenStreetMap Nominatim API for reverse geocoding (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=3`,
        {
          headers: {
            'User-Agent': 'GlobeRadio/1.0',
          },
        }
      );

      if (!response.ok) {
        console.warn('Reverse geocoding API error:', response.status);
        return null;
      }

      const data = await response.json();
      const countryCode = data.address?.country_code?.toUpperCase();

      if (countryCode) {
        console.log(`🌍 Reverse geocoded ${lat.toFixed(2)}, ${lon.toFixed(2)} → ${countryCode} (${data.address?.country})`);
        // Cache the result
        geocodeCache.set(cacheKey, countryCode);
        return countryCode;
      }

      // Cache null result to avoid repeated failed requests
      geocodeCache.set(cacheKey, null);
      return null;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return null;
    }
  }

  // Helper: Determine country code from coordinates (rough approximation - FALLBACK ONLY)
  private static getCountryCodeFromCoordinates(coordinates: Coordinates): string | null {
    const { lat, lon } = coordinates;

    // Simple geographic regions (ordered by specificity - smaller countries first)
    // Europe
    if (lat >= 50 && lat <= 61 && lon >= -8 && lon <= 2) return 'GB'; // UK
    if (lat >= 51 && lat <= 55 && lon >= 3 && lon <= 8) return 'NL'; // Netherlands
    if (lat >= 49 && lat <= 52 && lon >= 2 && lon <= 7) return 'BE'; // Belgium
    if (lat >= 46 && lat <= 50 && lon >= 5 && lon <= 11) return 'CH'; // Switzerland
    if (lat >= 46 && lat <= 49 && lon >= 9 && lon <= 17) return 'AT'; // Austria
    if (lat >= 47 && lat <= 55 && lon >= 5 && lon <= 16) return 'DE'; // Germany
    if (lat >= 41 && lat <= 51 && lon >= -5 && lon <= 10) return 'FR'; // France
    if (lat >= 36 && lat <= 44 && lon >= -10 && lon <= 4) return 'ES'; // Spain
    if (lat >= 38 && lat <= 43 && lon >= -10 && lon <= -6) return 'PT'; // Portugal
    if (lat >= 36 && lat <= 47 && lon >= 6 && lon <= 19) return 'IT'; // Italy
    if (lat >= 42 && lat <= 47 && lon >= 19 && lon <= 30) return 'RO'; // Romania
    if (lat >= 41 && lat <= 45 && lon >= 19 && lon <= 23) return 'RS'; // Serbia
    if (lat >= 38 && lat <= 42 && lon >= 19 && lon <= 28) return 'GR'; // Greece
    if (lat >= 36 && lat <= 42 && lon >= 26 && lon <= 45) return 'TR'; // Turkey
    if (lat >= 41 && lat <= 52 && lon >= 14 && lon <= 25) return 'PL'; // Poland
    if (lat >= 48 && lat <= 51 && lon >= 12 && lon <= 23) return 'CZ'; // Czech Republic
    if (lat >= 54 && lat <= 70 && lon >= 4 && lon <= 32) return 'SE'; // Sweden
    if (lat >= 58 && lat <= 71 && lon >= 4 && lon <= 32) return 'NO'; // Norway
    if (lat >= 54 && lat <= 58 && lon >= 8 && lon <= 16) return 'DK'; // Denmark
    if (lat >= 59 && lat <= 70 && lon >= 20 && lon <= 32) return 'FI'; // Finland
    if (lat >= 56 && lat <= 58 && lon >= 21 && lon <= 29) return 'LV'; // Latvia
    if (lat >= 53 && lat <= 57 && lon >= 20 && lon <= 29) return 'LT'; // Lithuania
    if (lat >= 57 && lat <= 60 && lon >= 21 && lon <= 28) return 'EE'; // Estonia

    // Asia-Pacific
    if (lat >= 24 && lat <= 46 && lon >= 123 && lon <= 146) return 'JP'; // Japan
    if (lat >= 33 && lat <= 43 && lon >= 124 && lon <= 132) return 'KR'; // South Korea
    if (lat >= 21 && lat <= 26 && lon >= 120 && lon <= 122) return 'TW'; // Taiwan
    if (lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135) return 'CN'; // China
    if (lat >= 8 && lat <= 37 && lon >= 68 && lon <= 97) return 'IN'; // India
    if (lat >= 5 && lat <= 21 && lon >= 92 && lon <= 102) return 'TH'; // Thailand
    if (lat >= 8 && lat <= 24 && lon >= 102 && lon <= 110) return 'VN'; // Vietnam
    if (lat >= 1 && lat <= 7 && lon >= 103 && lon <= 105) return 'SG'; // Singapore
    if (lat >= 1 && lat <= 7 && lon >= 100 && lon <= 120) return 'MY'; // Malaysia
    if (lat >= 5 && lat <= 21 && lon >= 118 && lon <= 127) return 'PH'; // Philippines
    if (lat >= -11 && lat <= 6 && lon >= 95 && lon <= 141) return 'ID'; // Indonesia

    // Americas
    if (lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66) return 'US'; // USA (continental)
    if (lat >= 42 && lat <= 84 && lon >= -141 && lon <= -52) return 'CA'; // Canada
    if (lat >= 14 && lat <= 33 && lon >= -118 && lon <= -86) return 'MX'; // Mexico
    if (lat >= -34 && lat <= 5 && lon >= -74 && lon <= -34) return 'BR'; // Brazil
    if (lat >= -56 && lat <= -21 && lon >= -74 && lon <= -53) return 'AR'; // Argentina
    if (lat >= -56 && lat <= -17 && lon >= -76 && lon <= -66) return 'CL'; // Chile
    if (lat >= -5 && lat <= 13 && lon >= -80 && lon <= -66) return 'CO'; // Colombia
    if (lat >= -19 && lat <= -0 && lon >= -82 && lon <= -68) return 'PE'; // Peru

    // Oceania
    if (lat >= -44 && lat <= -10 && lon >= 113 && lon <= 154) return 'AU'; // Australia
    if (lat >= -47 && lat <= -34 && lon >= 166 && lon <= 179) return 'NZ'; // New Zealand

    // Middle East & Africa
    if (lat >= 22 && lat <= 27 && lon >= 51 && lon <= 57) return 'AE'; // UAE
    if (lat >= 16 && lat <= 33 && lon >= 34 && lon <= 56) return 'SA'; // Saudi Arabia
    if (lat >= 25 && lat <= 32 && lon >= 26 && lon <= 37) return 'EG'; // Egypt
    if (lat >= -35 && lat <= -22 && lon >= 16 && lon <= 33) return 'ZA'; // South Africa
    if (lat >= 25 && lat <= 38 && lon >= 44 && lon <= 64) return 'IR'; // Iran
    if (lat >= 29 && lat <= 38 && lon >= 60 && lon <= 75) return 'PK'; // Pakistan
    if (lat >= -5 && lat <= 5 && lon >= 29 && lon <= 42) return 'KE'; // Kenya
    if (lat >= 3 && lat <= 18 && lon >= 33 && lon <= 48) return 'ET'; // Ethiopia
    if (lat >= 4 && lat <= 14 && lon >= 2 && lon <= 15) return 'NG'; // Nigeria
    if (lat >= 27 && lat <= 36 && lon >= -13 && lon <= -1) return 'MA'; // Morocco
    if (lat >= 10 && lat <= 23 && lon >= -18 && lon <= 25) return 'SD'; // Sudan
    if (lat >= -26 && lat <= -15 && lon >= 21 && lon <= 36) return 'ZW'; // Zimbabwe
    if (lat >= -18 && lat <= -8 && lon >= 12 && lon <= 24) return 'AO'; // Angola
    if (lat >= -13 && lat <= -1 && lon >= 29 && lon <= 41) return 'TZ'; // Tanzania
    if (lat >= -2 && lat <= 5 && lon >= 8 && lon <= 19) return 'GA'; // Gabon
    if (lat >= -13 && lat <= -8 && lon >= 22 && lon <= 34) return 'ZM'; // Zambia
    if (lat >= 0 && lat <= 4 && lon >= 9 && lon <= 19) return 'CG'; // Congo
    if (lat >= 5 && lat <= 11 && lon >= -3 && lon <= 3) return 'GH'; // Ghana

    // Russia (largest, check last)
    if (lat >= 41 && lat <= 82 && lon >= 19 && lon <= 180) return 'RU'; // Russia

    return null;
  }

  // Enhanced geo search that tries country-specific search first
  static async searchByGeoEnhanced(coordinates: Coordinates, limit: number = 20): Promise<RadioStation[]> {
    try {
      // Try API-based reverse geocoding first
      let countryCode = await this.getCountryCodeFromAPI(coordinates);

      // Fallback to hardcoded regions if API fails
      if (!countryCode) {
        console.log('API geocoding failed, using fallback method...');
        countryCode = this.getCountryCodeFromCoordinates(coordinates);
      }

      if (countryCode) {
        console.log(`Detected country: ${countryCode}, searching local stations...`);

        // Get stations from detected country
        const countryStations = await this.searchByCountry(countryCode, 100);

        if (countryStations.length > 0) {
          // Calculate distances and sort
          const stationsWithDistance = countryStations
            .filter((station) => station.geo_lat !== null && station.geo_long !== null)
            .map((station) => ({
              ...station,
              distance: calculateDistance(coordinates, {
                lat: station.geo_lat!,
                lon: station.geo_long!,
              }),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);

          if (stationsWithDistance.length >= limit / 2) {
            // If we got enough stations from this country, return them
            return stationsWithDistance;
          }
        }
      }

      // Fallback to regular geo search if country detection failed or not enough stations
      return this.searchByGeo(coordinates, limit);
    } catch (error) {
      console.error('Enhanced geo search failed, falling back to regular search:', error);
      return this.searchByGeo(coordinates, limit);
    }
  }

  // Get the actual stream URL and register a click
  static async getStreamUrl(stationUuid: string): Promise<string | null> {
    try {
      const response = await fetchWithRetry(`/url/${stationUuid}`);
      const data = await response.json();
      // The API returns { ok: boolean, message: string, url: string }
      return data.url || null;
    } catch (error) {
      console.debug('Failed to get stream URL:', error);
      return null;
    }
  }

  // Register station click (for analytics)
  static async registerClick(stationUuid: string): Promise<void> {
    try {
      // Use the click endpoint to increment counter
      const fullUrl = `${getAPIBaseURL()}/url/${stationUuid}`;
      // Fire and forget - don't wait for response
      fetch(fullUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'GlobeRadio/1.0' },
      }).catch(() => {
        // Silently fail
      });
    } catch (error) {
      // Silently fail for click tracking
      console.debug('Click tracking failed:', error);
    }
  }
}
