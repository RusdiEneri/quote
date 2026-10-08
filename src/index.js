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

const defaultTtl = 60 * 60 * 1000;

const inflight = new Map();
const cache = cm.createCache({ ttl: defaultTtl });

const queue = fastq.promise(async ({ key, c, body }) => {
	try {
		const data = await Quote(body);

		const result = c.json(data);

		await cache.set(key, result);

		return result;
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
		if (c.req.header('content-type') !== 'application/json') {
			return c.json({ status: false, message: 'Content-Type must be application/json' }, 400);
		}

		const body = await c.req.json();

		// body validation
		if (!body.messages) return c.json({ status: false, message: 'messages is required' }, 400);
		if (!Array.isArray(body.messages)) return c.json({ status: false, message: 'messages must be an array' }, 400);
		if (typeof body.messages[0] !== 'object') {
			return c.json({ status: false, message: 'messages must be an array of objects' }, 400);
		}

		const key = Bun.CryptoHasher.hash("sha256", JSON.stringify(body)).toString('hex');

		const cached = await cache.get(key);
		if (cached !== undefined) {
			cached.headers.set('X-Cache', 'HIT');
			return cached instanceof Response ? cached.clone() : cached;
		}

		if (inflight.has(key)) {
			const result = await inflight.get(key);
			result.headers.set('X-Cache', 'HIT');
			return result instanceof Response ? result.clone() : result;
		}

		const promise = queue.push({ key, c, body });
		inflight.set(key, promise);

		const result = await promise;

		result.headers.set('X-Cache', 'MISS');
		return result instanceof Response ? result.clone() : result;
	} catch (e) {
		console.error(e);
		return c.json({ status: false, message: 'Invalid JSON' }, 400);
	}
});

app.get('/status', c => {
	const uptime = process.uptime();
	return c.json({
		status: true,
		message: 'Quote API is running',
		uptime: new Date(uptime * 1000).toISOString().slice(11, 19),
	});
});

export default {
	port: process.env.PORT || 7860,
	fetch: app.fetch,
};
