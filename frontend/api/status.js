/**
 * Vercel Serverless Function: /api/status
 * Health check proxied to Hugging Face backend
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const hfRes = await fetch('https://ilhamdev-quote-api.hf.space/status');
    const text = await hfRes.text();
    res.setHeader('Content-Type', 'application/json');
    return res.status(hfRes.status).send(text);
  } catch (err) {
    return res.status(502).json({ status: false, message: 'Backend unreachable' });
  }
}
