import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import {
  SITE_ORIGIN,
  renderStationNotFoundPage,
  renderStationPage,
} from './worker-station-page';
import type { UpstreamStation } from './worker-station-page';

/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */
const DEBUG = false;

/** Upstream radio-browser.info API (same instance the /api/radio proxy uses). */
const UPSTREAM_API_BASE = 'https://all.api.radio-browser.info';
const UPSTREAM_USER_AGENT = 'GlobeRadio/1.0';

/** Logical freshness of cached upstream payloads (24h). */
const UPSTREAM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/**
 * How long entries physically stay in caches.default. Longer than the logical
 * TTL so that an expired ("stale") copy can still be served when upstream fails.
 */
const UPSTREAM_CACHE_RETENTION_S = 7 * 24 * 60 * 60;

/** Stations per sitemap chunk (protocol maximum is 50,000; we stay small). */
const STATIONS_PER_SITEMAP = 5000;

const STATION_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Minimal shape of the Workers execution context we rely on. */
interface WorkerCtx {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Handle API proxying to radio-browser.info
 */
async function handleAPIProxy(request: Request, url: URL): Promise<Response> {
  const apiPath = url.pathname.replace('/api/radio', '');
  const apiUrl = `${UPSTREAM_API_BASE}${apiPath}${url.search}`;

  try {
    // Copy headers from original request, but remove problematic ones
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      if (!['host', 'content-length'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    }

    // Set required user agent
    headers.set('User-Agent', 'GlobeRadio/1.0');

    // Create new request with proper headers
    const apiRequest = new Request(apiUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
    });

    const response = await fetch(apiRequest);

    // Create response and add CORS headers
    const proxyResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      proxyResponse.headers.set(key, value);
    });

    // Add CORS headers
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    proxyResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return proxyResponse;
  } catch (error) {
    console.error('API Proxy Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to proxy API request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle country detection using Cloudflare's CF-IPCountry header
 */
async function handleCountryDetection(request: Request): Promise<Response> {
  try {
    // Extract country from Cloudflare header
    const countryCode = request.headers.get('CF-IPCountry');

    if (!countryCode) {
      console.log('🌍 No CF-IPCountry header found, using fallback');
      return new Response(JSON.stringify({
        error: 'Country detection unavailable',
        country: null,
        lat: null,
        lon: null,
        city: null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🌍 Detected country: ${countryCode} from IP: ${request.headers.get('CF-Connecting-IP') || 'unknown'}`);

    // Return country detection response
    return new Response(JSON.stringify({
      country: countryCode,
      lat: null, // Will be handled by client-side mapping
      lon: null, // Will be handled by client-side mapping
      city: null, // Will be handled by client-side mapping
      detected: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Country detection error:', error);
    return new Response(JSON.stringify({
      error: 'Country detection failed',
      country: null,
      lat: null,
      lon: null,
      city: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ---------------------------------------------------------------------------
// Server-rendered station landing pages + sitemaps
// ---------------------------------------------------------------------------

/** caches.default is not in the DOM lib types; it exists in the Workers runtime. */
function getEdgeCache(): Cache {
  return (caches as unknown as { default: Cache }).default;
}

/** Fetch JSON from the upstream radio-browser API. Returns null on any failure. */
async function fetchUpstreamJson(upstreamPathAndQuery: string): Promise<unknown | null> {
  try {
    const response = await fetch(UPSTREAM_API_BASE + upstreamPathAndQuery, {
      headers: { 'User-Agent': UPSTREAM_USER_AGENT, Accept: 'application/json' },
    });
    if (!response.ok) {
      console.error('Upstream non-OK response:', response.status, upstreamPathAndQuery);
      return null;
    }
    return (await response.json()) as unknown;
  } catch (error) {
    console.error('Upstream fetch failed:', upstreamPathAndQuery, error);
    return null;
  }
}

/**
 * Get upstream JSON through caches.default.
 * - Entries younger than UPSTREAM_CACHE_TTL_MS are served without touching upstream.
 * - Expired entries are refreshed from upstream; if upstream fails, the stale
 *   entry is served instead (soft fallback).
 */
async function getCachedUpstreamJson(
  origin: string,
  keyPath: string,
  upstreamPathAndQuery: string,
  ctx: WorkerCtx
): Promise<unknown | null> {
  const cache = getEdgeCache();
  const cacheKey = new Request(origin + keyPath);
  const now = Date.now();

  let stale: unknown = null;
  const cached = await cache.match(cacheKey);
  if (cached) {
    const cachedAt = Number(cached.headers.get('x-cached-at') || 0);
    try {
      const parsed = (await cached.json()) as unknown;
      if (now - cachedAt < UPSTREAM_CACHE_TTL_MS) {
        return parsed;
      }
      stale = parsed;
    } catch {
      // Unreadable cache entry — ignore and refresh from upstream.
    }
  }

  const fresh = await fetchUpstreamJson(upstreamPathAndQuery);
  if (fresh !== null) {
    const toCache = new Response(JSON.stringify(fresh), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Cached-At': String(now),
        'Cache-Control': 'public, max-age=' + UPSTREAM_CACHE_RETENTION_S,
      },
    });
    ctx.waitUntil(cache.put(cacheKey, toCache));
    return fresh;
  }

  return stale;
}

/** Return the uuid when pathname addresses a station landing page, else null. */
function matchStationPageUuid(pathname: string): string | null {
  const match = pathname.match(/^\/station\/([^/]+)\/?$/);
  if (!match) return null;
  return STATION_UUID_RE.test(match[1]) ? match[1] : null;
}

/** A station is renderable when it has a stream URL and passed the last check. */
function isPlayableStation(station: UpstreamStation): boolean {
  const hasStream = Boolean(station.url_resolved || station.url);
  return hasStream && Number(station.lastcheckok) === 1;
}

function stationNotFoundResponse(): Response {
  return new Response(renderStationNotFoundPage(), {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function handleStationPage(
  origin: string,
  uuid: string,
  ctx: WorkerCtx
): Promise<Response> {
  const data = await getCachedUpstreamJson(
    origin,
    '/__cache/station/' + uuid,
    '/json/stations/byuuid?uuids=' + encodeURIComponent(uuid),
    ctx
  );
  const station = Array.isArray(data) ? (data[0] as UpstreamStation | undefined) : undefined;
  if (!station || typeof station !== 'object' || !isPlayableStation(station)) {
    return stationNotFoundResponse();
  }

  // "More from {country}": top 8 other stations of the same country (fails soft).
  let related: UpstreamStation[] = [];
  const countryCode = String(station.countrycode ?? '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(countryCode)) {
    const countryData = await getCachedUpstreamJson(
      origin,
      '/__cache/country/' + countryCode,
      '/json/stations/bycountrycodeexact/' + countryCode +
        '?order=votes&reverse=true&hidebroken=true&limit=9',
      ctx
    );
    if (Array.isArray(countryData)) {
      related = (countryData as UpstreamStation[])
        .filter(
          (s) =>
            s && typeof s === 'object' && s.stationuuid && s.stationuuid !== uuid
        )
        .slice(0, 8);
    }
  }

  return new Response(renderStationPage(station, related), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

// --- Sitemaps ----------------------------------------------------------------

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** Top stations by votes (up to 5000), cached for 24h. Empty array on failure. */
async function getTopStations(origin: string, ctx: WorkerCtx): Promise<UpstreamStation[]> {
  const data = await getCachedUpstreamJson(
    origin,
    '/__cache/stationlist',
    '/json/stations?order=votes&reverse=true&hidebroken=true&limit=5000',
    ctx
  );
  return Array.isArray(data) ? (data as UpstreamStation[]) : [];
}

function renderSitemapIndex(stationCount: number): string {
  const chunkCount = Math.ceil(stationCount / STATIONS_PER_SITEMAP);
  const entries = ['  <sitemap><loc>' + SITE_ORIGIN + '/sitemap/pages.xml</loc></sitemap>'];
  for (let i = 1; i <= chunkCount; i++) {
    entries.push('  <sitemap><loc>' + SITE_ORIGIN + '/sitemap/stations-' + i + '.xml</loc></sitemap>');
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join('\n') +
    '\n</sitemapindex>\n'
  );
}

function renderPagesSitemap(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    '  <url><loc>' + SITE_ORIGIN + '/</loc></url>\n' +
    '</urlset>\n'
  );
}

function renderStationsSitemap(stations: UpstreamStation[]): string {
  const urls = stations
    .map((station) => {
      const uuid = station && String(station.stationuuid ?? '');
      if (!uuid || !STATION_UUID_RE.test(uuid)) return null;
      return '  <url><loc>' + SITE_ORIGIN + '/station/' + escapeXml(uuid) + '</loc></url>';
    })
    .filter((line): line is string => line !== null);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') +
    '\n</urlset>\n'
  );
}

async function handleStationsSitemapChunk(
  origin: string,
  ctx: WorkerCtx,
  chunk: number
): Promise<Response> {
  const stations = await getTopStations(origin, ctx);
  const chunkCount = Math.ceil(stations.length / STATIONS_PER_SITEMAP);
  if (chunk < 1 || chunk > chunkCount) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const slice = stations.slice(
    (chunk - 1) * STATIONS_PER_SITEMAP,
    chunk * STATIONS_PER_SITEMAP
  );
  return xmlResponse(renderStationsSitemap(slice));
}

// Export the handler for wrangler
export default {
  async fetch(request: Request, _env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    let options: { [key: string]: any } = {};

    try {
      // Handle country detection API
      if (url.pathname === '/api/country') {
        return handleCountryDetection(request);
      }

      // Handle API proxying for radio-browser API
      if (url.pathname.startsWith('/api/radio/')) {
        return handleAPIProxy(request, url);
      }

      // Server-rendered station pages + sitemaps (before the asset fallback)
      if (request.method === 'GET') {
        const stationUuid = matchStationPageUuid(url.pathname);
        if (stationUuid) {
          return await handleStationPage(url.origin, stationUuid, ctx);
        }

        if (url.pathname === '/sitemap.xml') {
          const stations = await getTopStations(url.origin, ctx);
          return xmlResponse(renderSitemapIndex(stations.length));
        }

        if (url.pathname === '/sitemap/pages.xml') {
          return xmlResponse(renderPagesSitemap());
        }

        const sitemapMatch = url.pathname.match(/^\/sitemap\/stations-(\d+)\.xml$/);
        if (sitemapMatch) {
          return await handleStationsSitemapChunk(
            url.origin,
            ctx,
            parseInt(sitemapMatch[1], 10)
          );
        }
      }

      // Handle static assets
      if (DEBUG) {
        // customize caching
        options.cacheControl = {
          bypassCache: true,
        };
      }

      const page = await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx)
        },
        options
      );

      // allow headers to be altered
      const response = new Response(page.body, page);

      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('Referrer-Policy', 'unsafe-url');
      response.headers.set('Feature-Policy', 'none');

      return response;

    } catch (e: any) {
      // if an error is thrown try to serve the asset at 404.html
      if (!DEBUG) {
        try {
          let notFoundResponse = await getAssetFromKV(
            {
              request,
              waitUntil: ctx.waitUntil.bind(ctx)
            },
            {
              // mapRequestToAsset: (req: Request) => new Request(`${new URL(req.url).origin}/404.html`, req),
            }
          );

          return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 });
        } catch (err) {
          // if there is no 404.html file, serve the default 404 response
        }
      }

      return new Response((e as Error).message || e.toString(), { status: 500 });
    }
  }
}