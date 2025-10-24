import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */
const DEBUG = false;

/**
 * Handle API proxying to radio-browser.info
 */
async function handleAPIProxy(request: Request, url: URL): Promise<Response> {
  const apiPath = url.pathname.replace('/api/radio', '');
  const apiUrl = `https://all.api.radio-browser.info${apiPath}${url.search}`;

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