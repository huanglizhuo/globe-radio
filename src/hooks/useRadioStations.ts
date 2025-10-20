import { useState, useCallback } from 'react';
import type { RadioStation, Coordinates } from '../types';
import { RadioBrowserAPI } from '../services/radioBrowserAPI';

export function useRadioStations() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchStations = useCallback(async (coordinates: Coordinates) => {
    setLoading(true);
    setError(null);

    try {
      // Use enhanced geo search that detects country first
      const results = await RadioBrowserAPI.searchByGeoEnhanced(coordinates, 20);

      if (results.length === 0) {
        // If no stations found, show message but don't fallback to global
        setError('No stations found in this region. Try rotating the globe to another location.');
        setStations([]);
      } else {
        setStations(results);
      }
    } catch (err) {
      setError('Failed to load radio stations');
      console.error('Error loading stations:', err);
      setStations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // No initial load - wait for user to rotate globe
  // User will see a message to rotate the globe to start

  return { stations, loading, error, searchStations };
}
