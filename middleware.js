/**
 * Vercel Edge Middleware
 * Enables POST requests directly on qc.mangrusdi.my.id (POST /, POST /generate, POST /api)
 * with IP forwarding, status caching, and rate limit shield for Hugging Face Space.
 */

const BACKEND_URL = 'https://ilhamdev-quote-api.hf.space';

export const config = {
  matcher: ['/', '/generate', '/status', '/api/:path*'],
};

// Edge cache for /status to reduce Hugging Face wakeups and pings
let cachedStatusBody = null;
let cachedStatusTime = 0;
const STATUS_CACHE_TTL_MS = 15000; // 15 seconds

// Edge rate limiting: max 35 POST requests per minute per IP
const edgeRateLimits = new Map();
const RATE_WINDOW_MS = 60000;
const MAX_EDGE_REQUESTS = 35;

function isEdgeRateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  let history = edgeRateLimits.get(ip) || [];
  history = history.filter(t => now - t < RATE_WINDOW_MS);
  if (history.length >= MAX_EDGE_REQUESTS) {
    edgeRateLimits.set(ip, history);
    return true;
  }
  history.push(now);
  edgeRateLimits.set(ip, history);
  return false;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   request.headers.get('x-real-ip') ||
                   'anonymous';

  // 1. CORS Preflight Support
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      },
    });
  }

  // 2. Health Check (/status or /api/status) with Edge Caching
  if (url.pathname === '/status' || url.pathname === '/api/status') {
    const now = Date.now();
    if (cachedStatusBody && (now - cachedStatusTime) < STATUS_CACHE_TTL_MS) {
      return new Response(cachedStatusBody, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Edge-Cache': 'HIT',
        },
      });
    }

    try {
      const res = await fetch(`${BACKEND_URL}/status`);
      const body = await res.text();
      if (res.ok) {
        cachedStatusBody = body;
        cachedStatusTime = now;
      }
      return new Response(body, {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Edge-Cache': 'MISS',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ status: false, message: 'Backend unreachable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // 3. Direct POST Requests (e.g. POST /, POST /generate, POST /api/generate)
  if (request.method === 'POST') {
    // Edge Rate Limiting Shield
    if (isEdgeRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({
          status: false,
          message: 'Rate limit exceeded (35 req/min). Hugging Face Space capacity protection active.',
          retryAfter: 60,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Retry-After': '60',
          },
        }
      );
    }

    try {
      const requestBody = await request.text();
      const headers = new Headers();
      headers.set('Content-Type', request.headers.get('content-type') || 'application/json');
      headers.set('x-forwarded-for', request.headers.get('x-forwarded-for') || clientIp);
      headers.set('x-real-ip', clientIp);

      const response = await fetch(`${BACKEND_URL}/`, {
        method: 'POST',
        headers: headers,
        body: requestBody,
      });

      const responseData = await response.text();

      return new Response(responseData, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Cache-Control': response.headers.get('cache-control') || 'public, max-age=1800',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ status: false, message: `Proxy error: ${err.message}` }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }

  // 4. Fall through for GET / to serve the static Vite web application
}
