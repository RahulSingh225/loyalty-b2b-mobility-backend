import { createClient } from 'redis';

export const redis = createClient({ url: process.env.REDIS_URL });

let _ready = false;

async function initRedis() {
	if (!process.env.REDIS_URL) {
		console.warn('REDIS_URL not set — skipping Redis connection');
		return;
	}

	redis.on('error', (err) => console.error('Redis Client Error', err));

	try {
		await redis.connect();
		_ready = true;
		console.log('Redis connected');
	} catch (err) {
		console.error('Redis connection failed — continuing without Redis', err);
	}
}

// start connection asynchronously but don't let failure crash the process
void initRedis();

export const isRedisReady = () => _ready;
