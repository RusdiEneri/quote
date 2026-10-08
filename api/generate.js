/**
 * Vercel Serverless Function: /api/generate
 * Proxies POST quote generation requests to Hugging Face backend
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const hfRes = await fetch('https://ilhamdev-quote-api.hf.space/', {
        method: 'POST',
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
        },
        body: body,
      });

      const contentType = hfRes.headers.get('content-type') || 'application/json';
      res.setHeader('Content-Type', contentType);

      if (contentType.includes('image')) {
        const arrayBuf = await hfRes.arrayBuffer();
        return res.status(hfRes.status).send(Buffer.from(arrayBuf));
      }

      const text = await hfRes.text();
      return res.status(hfRes.status).send(text);
    } catch (err) {
      return res.status(502).json({ status: false, message: `Proxy error: ${err.message}` });
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: true,
      message: 'Quote API Subdomain Proxy active. Send POST requests to generate quotes.',
    });
  }

  return res.status(405).json({ status: false, message: 'Method Not Allowed' });
}
