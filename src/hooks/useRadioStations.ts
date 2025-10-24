import { useState, useCallback } from 'react';
import type { RadioStation, Coordinates } from '../types';
import { RadioBrowserAPI } from '../services/radioBrowserAPI';

export function useRadioStations() {
  // All stations for map display (loaded once, never replaced)
  const [allStations, setAllStations] = useState<RadioStation[]>([]);
  // Current playable stations for audio player (updated on location search)
  const [playableStations, setPlayableStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all stations with geographic coordinates for global display
  const loadAllStations = useCallback(async (limit: number = 10000) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🌍 Loading all stations globally...');
      const results = await RadioBrowserAPI.getAllStationsWithGeo(limit);

      if (results.length === 0) {
        setError('No stations available');
        setAllStations([]);
      } else {
        setAllStations(results);
        console.log(`✅ Successfully loaded ${results.length} stations for map display`);
      }
    } catch (err) {
      setError('Failed to load radio stations');
      console.error('Error loading all stations:', err);
      setAllStations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search stations by geo coordinates (for location-based playback)
  const searchStations = useCallback(async (coordinates: Coordinates) => {
    setLoading(true);
    setError(null);

    try {
      // Use enhanced geo search that detects country first
      const results = await RadioBrowserAPI.searchByGeoEnhanced(coordinates, 20);

      if (results.length === 0) {
        // If no stations found, show message but don't fallback to global
        setError('No stations found in this region. Try rotating the globe to another location.');
        setPlayableStations([]);
      } else {
        setPlayableStations(results);
        console.log(`✅ Found ${results.length} playable stations in this region`);
      }
    } catch (err) {
      setError('Failed to load radio stations');
      console.error('Error loading stations:', err);
      setPlayableStations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { allStations, playableStations, loading, error, searchStations, loadAllStations };
}
