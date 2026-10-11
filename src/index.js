import * as cm from 'cache-manager';
import fastq from 'fastq';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { marked } from 'marked';
import { poweredBy } from 'hono/powered-by';
import { prettyJSON } from 'hono/pretty-json';
import { serveStatic } from 'hono/serve-static';

import Quote from './core/index.js';
import getClientIP from './utils/getClientIp.js';

const app = new Hono();

const defaultTtl = 60 * 60 * 1000; // 1 hour

const inflight = new Map();
const cache = cm.createCache({ ttl: defaultTtl });

// Rate Limiter: 30 requests per minute per IP to protect public Hugging Face Space
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const ipRequestHistory = new Map();

// Periodic cleanup of rate limit history
setInterval(() => {
	const now = Date.now();
	for (const [ip, timestamps] of ipRequestHistory.entries()) {
		const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
		if (valid.length === 0) {
			ipRequestHistory.delete(ip);
		} else {
			ipRequestHistory.set(ip, valid);
		}
	}
}, 2 * 60 * 1000);

function isRateLimited(ip) {
	if (!ip) return false;
	const now = Date.now();
	let timestamps = ipRequestHistory.get(ip) || [];
	timestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
	if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
		ipRequestHistory.set(ip, timestamps);
		return true;
	}
	timestamps.push(now);
	ipRequestHistory.set(ip, timestamps);
	return false;
}

// Queue Concurrency 4 with backpressure limit of 8 pending jobs
const queue = fastq.promise(async ({ key, body }) => {
	try {
		const data = await Quote(body);
		await cache.set(key, data);
		return data;
	} finally {
		inflight.delete(key);
	}
}, 4);

app.use('*', cors({
	origin: '*',
	allowMethods: ['GET', 'POST', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(poweredBy({ serverName: 'Hisoka Labs' }));
app.use(prettyJSON({ space: 3 }));

app.use(
	serveStatic({
		root: './public',
		getContent: async (file, c) => {
			const res = Bun.file(file);
			if (await res.exists()) {
				const data = await res.arrayBuffer();
				const mime = res.type;

				return c.body(data, 200, { 'Content-Type': mime });
			}
		},
	}),
);

app.use(async (c, next) => {
	var colorStatus = status => {
		switch ((status / 100) | 0) {
			case 5:
				return `\x1B[31m${status}\x1B[0m`;
			case 4:
				return `\x1B[33m${status}\x1B[0m`;
			case 3:
				return `\x1B[36m${status}\x1B[0m`;
			case 2:
				return `\x1B[32m${status}\x1B[0m`;
		}
		return `${status}`;
	};

	const start = Date.now();
	const ipClient = getClientIP(c);

	await next();

	console.log(
		`${ipClient} ${c.req.method} ${c.req.path + new URL(c.req.url).search} ${colorStatus(c.res.status)} ${Date.now() - start}ms`,
	);
});

app.get('/', async c => {
	const res = Bun.file('README.md');
	const text = await res.text();
	const html = marked.parse(text);

	return c.html(`<html>
	  <head>
			<title>Quote API Documentation</title>
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<meta charset="utf-8">
			<meta name="description" content="An Quote API Telegram fast, simple, and free.">
			<meta name="keywords" content="quote api, telegram quote api, quote maker, quote generator, hisoka labs, kualat">
			<meta name="author" content="Hisoka Labs">
			<link rel="stylesheet" href="/styles.css">
			<link rel="icon" type="image/png" href="/favicon.png">
			<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css">
			<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
		</head>
	  <body>
			${html}
			<script>hljs.highlightAll();</script>
	  </body>
   </html>`);
});

app.post('/', async c => {
	try {
		const ipClient = getClientIP(c);

		// 1. IP Rate Limiting Guard (protect Hugging Face compute)
		if (isRateLimited(ipClient)) {
			return c.json({
				status: false,
				message: 'Rate limit exceeded (30 requests/minute). Hugging Face Space capacity protection active.',
				retryAfter: 60,
			}, 429, {
				'Retry-After': '60',
				'Cache-Control': 'no-store',
			});
		}

		// 2. Queue Backpressure Guard (protect against CPU & OOM exhaustion)
		if (queue.length() > 8) {
			return c.json({
				status: false,
				message: 'Server rendering engine is currently under heavy load. Please retry in 5 seconds.',
			}, 503, {
				'Retry-After': '5',
				'Cache-Control': 'no-store',
			});
		}

		if (c.req.header('content-type') && !c.req.header('content-type').includes('application/json')) {
			return c.json({ status: false, message: 'Content-Type must be application/json' }, 400);
		}

		const body = await c.req.json();

		// 3. Body Validation & Resource Protection
		if (!body.messages) return c.json({ status: false, message: 'messages is required' }, 400);
		if (!Array.isArray(body.messages)) return c.json({ status: false, message: 'messages must be an array' }, 400);
		if (body.messages.length === 0) return c.json({ status: false, message: 'messages cannot be empty' }, 400);
		if (body.messages.length > 8) {
			return c.json({ status: false, message: 'Exceeded maximum message count (max 8 messages per quote)' }, 400);
		}
		if (typeof body.messages[0] !== 'object') {
			return c.json({ status: false, message: 'messages must be an array of objects' }, 400);
		}

		// Protect string length to prevent memory bombs
		for (const msg of body.messages) {
			if (msg?.text && typeof msg.text === 'string' && msg.text.length > 3000) {
				return c.json({ status: false, message: 'Message text exceeds 3000 characters limit' }, 400);
			}
			if (msg?.from?.photo?.url && typeof msg.from.photo.url === 'string' && msg.from.photo.url.length > 6000000) {
				return c.json({ status: false, message: 'Avatar image payload exceeds 6MB limit' }, 400);
			}
			if (msg?.media?.url && typeof msg.media.url === 'string' && msg.media.url.length > 6000000) {
				return c.json({ status: false, message: 'Media attachment payload exceeds 6MB limit' }, 400);
			}
		}

		const key = Bun.CryptoHasher.hash("sha256", JSON.stringify(body)).toString('hex');

		const cached = await cache.get(key);
		if (cached !== undefined) {
			return c.json(cached, 200, {
				'X-Cache': 'HIT',
				'Cache-Control': 'public, max-age=3600',
			});
		}

		if (inflight.has(key)) {
			const inflightData = await inflight.get(key);
			return c.json(inflightData, 200, {
				'X-Cache': 'HIT',
				'Cache-Control': 'public, max-age=3600',
			});
		}

		const promise = queue.push({ key, body });
		inflight.set(key, promise);

		const resultData = await promise;

		return c.json(resultData, 200, {
			'X-Cache': 'MISS',
			'Cache-Control': 'public, max-age=3600',
		});
	} catch (e) {
		console.error(e);
		return c.json({ status: false, message: 'Invalid JSON or rendering error' }, 400);
	}
});

app.get('/status', c => {
	const uptime = process.uptime();
	const mem = process.memoryUsage();
	return c.json({
		status: true,
		message: 'Quote API is running',
		uptime: new Date(uptime * 1000).toISOString().slice(11, 19),
		queueWaiting: queue.length(),
		memoryMb: Math.round(mem.rss / 1024 / 1024),
	}, 200, {
		'Cache-Control': 'public, max-age=10',
	});
});

export default {
	port: process.env.PORT || 7860,
	fetch: app.fetch,
};
