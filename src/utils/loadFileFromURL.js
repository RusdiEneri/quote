export default async (url, filter = false) => {
	if (!url) throw new Error('URL is required');

	// Support direct Base64 Data URL
	if (url.startsWith('data:')) {
		const base64Part = url.includes(',') ? url.split(',')[1] : url;
		return Buffer.from(base64Part, 'base64');
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 6000);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			redirect: 'follow',
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
			},
		});

		clearTimeout(timeout);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const arrayBuffer = await response.arrayBuffer();
		return Buffer.from(arrayBuffer);
	} catch (err) {
		clearTimeout(timeout);
		throw err;
	}
};
