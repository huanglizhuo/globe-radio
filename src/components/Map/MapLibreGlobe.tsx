import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapLibreGlobeProps {
  onLocationChange?: (lat: number, lon: number) => void;
  initialLocation?: { lat: number; lon: number } | null;
}

export interface MapLibreGlobeHandle {
  jumpToRandomLocation: () => void;
}

// MapTiler API Key - Free tier: 100,000 requests/month
// Get your own at: https://www.maptiler.com/cloud/
const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY || '';

// Major cities from countries around the world (to ensure we land on land with radio stations)
const WORLD_CITIES = [
  // Asia
  { name: 'Tokyo, Japan', coords: [139.6917, 35.6895] },
  { name: 'Beijing, China', coords: [116.4074, 39.9042] },
  { name: 'Seoul, South Korea', coords: [126.9780, 37.5665] },
  { name: 'Bangkok, Thailand', coords: [100.5018, 13.7563] },
  { name: 'Mumbai, India', coords: [72.8777, 19.0760] },
  { name: 'Dubai, UAE', coords: [55.2708, 25.2048] },
  { name: 'Singapore', coords: [103.8198, 1.3521] },
  { name: 'Jakarta, Indonesia', coords: [106.8456, -6.2088] },
  { name: 'Manila, Philippines', coords: [120.9842, 14.5995] },
  { name: 'Hong Kong', coords: [114.1694, 22.3193] },
  { name: 'Taipei, Taiwan', coords: [121.5654, 25.0330] },
  { name: 'Istanbul, Turkey', coords: [28.9784, 41.0082] },
  { name: 'Tel Aviv, Israel', coords: [34.7818, 32.0853] },
  { name: 'Riyadh, Saudi Arabia', coords: [46.7219, 24.7136] },

  // Europe
  { name: 'London, UK', coords: [-0.1278, 51.5074] },
  { name: 'Paris, France', coords: [2.3522, 48.8566] },
  { name: 'Berlin, Germany', coords: [13.4050, 52.5200] },
  { name: 'Madrid, Spain', coords: [-3.7038, 40.4168] },
  { name: 'Rome, Italy', coords: [12.4964, 41.9028] },
  { name: 'Amsterdam, Netherlands', coords: [4.9041, 52.3676] },
  { name: 'Brussels, Belgium', coords: [4.3517, 50.8503] },
  { name: 'Vienna, Austria', coords: [16.3738, 48.2082] },
  { name: 'Stockholm, Sweden', coords: [18.0686, 59.3293] },
  { name: 'Oslo, Norway', coords: [10.7522, 59.9139] },
  { name: 'Copenhagen, Denmark', coords: [12.5683, 55.6761] },
  { name: 'Helsinki, Finland', coords: [24.9384, 60.1695] },
  { name: 'Warsaw, Poland', coords: [21.0122, 52.2297] },
  { name: 'Prague, Czech Republic', coords: [14.4378, 50.0755] },
  { name: 'Budapest, Hungary', coords: [19.0402, 47.4979] },
  { name: 'Athens, Greece', coords: [23.7275, 37.9838] },
  { name: 'Lisbon, Portugal', coords: [-9.1393, 38.7223] },
  { name: 'Dublin, Ireland', coords: [-6.2603, 53.3498] },
  { name: 'Moscow, Russia', coords: [37.6173, 55.7558] },
  { name: 'Kyiv, Ukraine', coords: [30.5234, 50.4501] },

  // North America
  { name: 'New York, USA', coords: [-74.0060, 40.7128] },
  { name: 'Los Angeles, USA', coords: [-118.2437, 34.0522] },
  { name: 'Chicago, USA', coords: [-87.6298, 41.8781] },
  { name: 'Miami, USA', coords: [-80.1918, 25.7617] },
  { name: 'Toronto, Canada', coords: [-79.3832, 43.6532] },
  { name: 'Vancouver, Canada', coords: [-123.1207, 49.2827] },
  { name: 'Montreal, Canada', coords: [-73.5673, 45.5017] },
  { name: 'Mexico City, Mexico', coords: [-99.1332, 19.4326] },
  { name: 'Guadalajara, Mexico', coords: [-103.3496, 20.6597] },

  // South America
  { name: 'São Paulo, Brazil', coords: [-46.6333, -23.5505] },
  { name: 'Rio de Janeiro, Brazil', coords: [-43.1729, -22.9068] },
  { name: 'Buenos Aires, Argentina', coords: [-58.3816, -34.6037] },
  { name: 'Santiago, Chile', coords: [-70.6693, -33.4489] },
  { name: 'Lima, Peru', coords: [-77.0428, -12.0464] },
  { name: 'Bogotá, Colombia', coords: [-74.0721, 4.7110] },
  { name: 'Caracas, Venezuela', coords: [-66.9036, 10.4806] },

  // Africa
  { name: 'Cairo, Egypt', coords: [31.2357, 30.0444] },
  { name: 'Lagos, Nigeria', coords: [3.3792, 6.5244] },
  { name: 'Johannesburg, South Africa', coords: [28.0473, -26.2041] },
  { name: 'Nairobi, Kenya', coords: [36.8219, -1.2921] },
  { name: 'Casablanca, Morocco', coords: [-7.5898, 33.5731] },
  { name: 'Addis Ababa, Ethiopia', coords: [38.7469, 9.0320] },
  { name: 'Accra, Ghana', coords: [-0.1870, 5.6037] },
  { name: 'Tunis, Tunisia', coords: [10.1815, 36.8065] },

  // Oceania
  { name: 'Sydney, Australia', coords: [151.2093, -33.8688] },
  { name: 'Melbourne, Australia', coords: [144.9631, -37.8136] },
  { name: 'Brisbane, Australia', coords: [153.0251, -27.4698] },
  { name: 'Auckland, New Zealand', coords: [174.7633, -36.8485] },
  { name: 'Wellington, New Zealand', coords: [174.7762, -41.2865] },
];

// Select a random city from around the world
function getRandomLocation(): [number, number] {
  const randomCity = WORLD_CITIES[Math.floor(Math.random() * WORLD_CITIES.length)];
  console.log(`🌍 Selected random city: ${randomCity.name}`);
  return randomCity.coords as [number, number];
}

export const MapLibreGlobe = forwardRef<MapLibreGlobeHandle, MapLibreGlobeProps>(
  ({ onLocationChange, initialLocation }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const moveEndTimerRef = useRef<number | undefined>(undefined);
    const [showSatellite, setShowSatellite] = useState(false);
    const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
    const isUserInteractionRef = useRef(false);
    const hasInitialLocationFiredRef = useRef(false);

    // Store initial location in a ref to use across callbacks
    // Use provided initialLocation or fallback to random location
    const initialLocationRef = useRef<[number, number] | null>(null);
    if (initialLocationRef.current === null) {
      if (initialLocation) {
        // Use country-based location if provided
        initialLocationRef.current = [initialLocation.lon, initialLocation.lat];
        console.log(`🌍 Using country-based location: ${initialLocation.lat.toFixed(2)}°, ${initialLocation.lon.toFixed(2)}°`);
      } else {
        // Fallback to random location
        initialLocationRef.current = getRandomLocation();
      }
    }

    // Expose method to jump to random location
    useImperativeHandle(ref, () => ({
      jumpToRandomLocation: () => {
        if (!map.current) return;

        const newLocation = getRandomLocation();
        console.log(`🎲 Jumping to random location: ${newLocation[0].toFixed(2)}°, ${newLocation[1].toFixed(2)}°`);

        // Fly to the new location with animation
        map.current.flyTo({
          center: [newLocation[0], newLocation[1]],
          duration: 2000, // 2 second animation
          essential: true // This animation is considered essential with respect to prefers-reduced-motion
        });
      }
    }));

  useEffect(() => {
    if (!mapContainer.current || map.current) return; // Initialize only once

    const basemap = 'openstreetmap';
    const osmStyle = `https://api.maptiler.com/maps/${basemap}/style.json?key=${MAPTILER_API_KEY}`;

    // Calculate optimal zoom level to show 80% of min(screen width, screen height)
    const minDimension = Math.min(
      mapContainer.current.clientWidth || window.innerWidth,
      mapContainer.current.clientHeight || window.innerHeight
    );

    // For MapLibre, zoom level calculation:
    // At zoom level 0, the world width is 256 pixels
    // Each zoom level doubles the resolution
    // We want the earth to occupy 80% of the min dimension
    const earthRadiusPixels = 256; // Base earth radius at zoom 0
    const targetEarthSize = minDimension * 0.8;
    const zoomLevel = Math.log2(targetEarthSize / earthRadiusPixels);

    // Clamp zoom level to reasonable bounds (1-5 for globe view)
    const optimalZoom = Math.max(1, Math.min(4, zoomLevel));

    // Get random starting location
    const randomLocation = initialLocationRef.current!; // Safe: initialized above
    console.log(`🌍 Starting location: [${randomLocation[0].toFixed(2)}, ${randomLocation[1].toFixed(2)}]`);
    console.log(`📐 Screen size: ${mapContainer.current.clientWidth}x${mapContainer.current.clientHeight}, min: ${minDimension}px`);
    console.log(`🔍 Calculated zoom level: ${optimalZoom.toFixed(2)} (target: ${targetEarthSize.toFixed(0)}px)`);

    // Create map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: osmStyle,
      zoom: optimalZoom,
      center: randomLocation,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      keyboard: false, // Disable keyboard navigation (arrow keys used for station switching)
    });

    // Add navigation controls to top left (below satellite toggle)
    map.current.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true,
      }),
      'top-left'
    );

    // Add globe control (if available in this version)
    // if ((maplibregl as any).GlobeControl) {
    //   map.current.addControl(new (maplibregl as any).GlobeControl());
    // }

    // Set globe projection when style loads
    map.current.on('style.load', () => {
      if (map.current) {
        map.current.setProjection({
          type: 'globe',
        });
      }
    });

    // Track user interactions
    map.current.on('dragstart', () => {
      isUserInteractionRef.current = true;
    });

    map.current.on('dragend', () => {
      isUserInteractionRef.current = false;
    });

    map.current.on('zoomstart', () => {
      isUserInteractionRef.current = true;
    });

    map.current.on('zoomend', () => {
      isUserInteractionRef.current = false;
    });

    map.current.on('rotatestart', () => {
      isUserInteractionRef.current = true;
    });

    map.current.on('rotateend', () => {
      isUserInteractionRef.current = false;
    });

    // Add 3D terrain and search circle
    map.current.on('load', () => {
      if (!map.current) return;

      map.current.addSource('terrain', {
        type: 'raster-dem',
        url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${MAPTILER_API_KEY}`,
      });

      map.current.setTerrain({
        source: 'terrain',
        exaggeration: 1.5,
      });

      // Add search circle source
      map.current.addSource('search-circle', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: randomLocation,
          },
        },
      });

      // Add circle layer (outer ring - search area)
      map.current.addLayer({
        id: 'search-area',
        type: 'circle',
        source: 'search-circle',
        paint: {
          'circle-radius': 40,
          'circle-color': '#3b82f6',
          'circle-opacity': 0.1,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#3b82f6',
          'circle-stroke-opacity': 0.6,
        },
      });

      // Add center point (inner dot)
      map.current.addLayer({
        id: 'search-center',
        type: 'circle',
        source: 'search-circle',
        paint: {
          'circle-radius': 6,
          'circle-color': '#3b82f6',
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 1,
        },
      });

      // Add satellite imagery source and layer (after all other layers)
      map.current.addSource('satellite', {
        type: 'raster',
        url: `https://api.maptiler.com/tiles/satellite-v2/tiles.json?key=${MAPTILER_API_KEY}`,
        tileSize: 256,
      });

      // Add satellite layer at the bottom (below all other layers)
      // Find the first symbol layer to insert satellite below it
      const layers = map.current.getStyle().layers;
      let firstSymbolId;
      for (const layer of layers) {
        if (layer.type === 'symbol') {
          firstSymbolId = layer.id;
          break;
        }
      }

      map.current.addLayer(
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'satellite',
          layout: {
            visibility: 'visible',
          },
          paint: {},
        },
        firstSymbolId // Insert before the first symbol layer
      );

      // Initial location trigger
      const center = map.current.getCenter();
      if (onLocationChange) {
        console.log(`🎯 Initial location: ${center.lat.toFixed(2)}°, ${center.lng.toFixed(2)}°`);
        hasInitialLocationFiredRef.current = true;
        lastLocationRef.current = { lat: center.lat, lng: center.lng };
        onLocationChange(center.lat, center.lng);
      }
    });

    // Handle map movement (debounced)
    map.current.on('move', () => {
      if (!map.current) return;

      // Update circle position immediately
      const center = map.current.getCenter();
      const source = map.current.getSource('search-circle') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [center.lng, center.lat],
          },
        });
      }

      // Clear previous timer
      if (moveEndTimerRef.current) {
        clearTimeout(moveEndTimerRef.current);
      }

      // Set new timer - trigger after 800ms of no movement
      moveEndTimerRef.current = window.setTimeout(() => {
        if (!map.current || !onLocationChange) return;

        const newCenter = map.current.getCenter();
        const lastLocation = lastLocationRef.current;

        // Check if location has changed significantly (more than 0.01 degrees)
        const significantChange = !lastLocation ||
          Math.abs(newCenter.lat - lastLocation.lat) > 0.01 ||
          Math.abs(newCenter.lng - lastLocation.lng) > 0.01;

        if (significantChange) {
          // Skip if this is the first move after initial load (prevents duplicate API call)
          if (!hasInitialLocationFiredRef.current) {
            console.log(`⏸️ Skipping move event - initial location not yet fired`);
            return;
          }

          console.log(`🗺️ Map moved significantly: ${newCenter.lat.toFixed(2)}°, ${newCenter.lng.toFixed(2)}°`);
          console.log(`📍 Previous: ${lastLocation ? `${lastLocation.lat.toFixed(2)}°, ${lastLocation.lng.toFixed(2)}°` : 'None'}`);
          console.log(`🎯 User interaction: ${isUserInteractionRef.current ? 'Yes' : 'No'}`);

          // Update last location
          lastLocationRef.current = { lat: newCenter.lat, lng: newCenter.lng };

          // Only trigger search if it's a user interaction or significant change
          onLocationChange(newCenter.lat, newCenter.lng);
        }
        // Remove the else clause to stop logging minor movements
      }, 400);
    });

  }, [onLocationChange, initialLocation]);

  // Toggle satellite layer visibility
  useEffect(() => {
    if (!map.current) return;

    const toggleLayer = () => {
      if (!map.current) return;

      // Check if the layer exists before trying to toggle it
      const layer = map.current.getLayer('satellite-layer');
      if (layer) {
        const visibility = showSatellite ? 'visible' : 'none';
        map.current.setLayoutProperty('satellite-layer', 'visibility', visibility);
        console.log(`🛰️ Satellite layer: ${showSatellite ? 'ON' : 'OFF'}`);
      } else {
        console.warn('Satellite layer not yet loaded, waiting...');
      }
    };

    // Wait for map to be loaded before toggling
    if (map.current.loaded()) {
      toggleLayer();
    } else {
      map.current.once('load', toggleLayer);
    }
  }, [showSatellite]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Map Container */}
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      />

      {/* Satellite Toggle Button */}
      <button
        onClick={() => setShowSatellite(!showSatellite)}
        className="absolute top-28 left-0 z-10 px-4 py-2 bg-white/90 hover:bg-white shadow-lg rounded-lg transition-all flex items-center gap-2 text-sm font-medium text-gray-800"
        aria-label="Toggle satellite view"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {showSatellite ? (
            // Map icon when satellite is active
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          ) : (
            // Satellite icon when map is active
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          )}
        </svg>
        <span>{showSatellite ? 'Map View' : 'Satellite'}</span>
      </button>
    </div>
  );
});

MapLibreGlobe.displayName = 'MapLibreGlobe';
