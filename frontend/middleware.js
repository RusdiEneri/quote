/**
 * Vercel Edge Middleware
 * Enables POST requests directly on qc.mangrusdi.my.id (POST /, POST /generate, POST /api)
 * while serving the interactive Vite web application on GET /.
 */

const BACKEND_URL = 'https://ilhamdev-quote-api.hf.space';

export const config = {
  matcher: ['/', '/generate', '/status', '/api/:path*'],
};

export default async function middleware(request) {
  const url = new URL(request.url);

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

  // 2. Health Check (/status or /api/status)
  if (url.pathname === '/status' || url.pathname === '/api/status') {
    try {
      const res = await fetch(`${BACKEND_URL}/status`);
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ status: false, message: 'Backend unreachable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // 3. Direct POST Requests to the Subdomain (e.g. POST /, POST /generate, POST /api/generate)
  if (request.method === 'POST') {
    try {
      const requestBody = await request.text();
      const response = await fetch(`${BACKEND_URL}/`, {
        method: 'POST',
        headers: {
          'Content-Type': request.headers.get('content-type') || 'application/json',
        },
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

  // 4. Default: Let Vercel serve the static Vite Web App for GET /
}
