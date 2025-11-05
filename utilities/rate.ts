import { config } from "../config.ts";

interface CacheEntry { expireAt: number; }

const cache = new Map<string, CacheEntry>();

function setCache(key: string, ttlSeconds: number): void { cache.set(key, { expireAt: Date.now() + ttlSeconds * 1000 }); }

function getCache(key: string): boolean {

    const entry = cache.get(key);

    if (!entry) return false;

    if (Date.now() > entry.expireAt) {

        cache.delete(key);

        return false;

    }

    return true;

}

setInterval(() => {

    const now = Date.now();

    for (const [k, v] of cache) {
        
        if (v.expireAt < now) cache.delete(k);
    
    }
    
}, 60_000);

const kv = await Deno.openKv();

export function checkTimeRateLimit(hashedIp: string, limitSeconds = config.RATE_LIMIT_INTERVAL_S): boolean {

    const cacheKey: string = `ratelimit:${hashedIp}`;

    if (getCache(cacheKey)) return false; 

    setCache(cacheKey, limitSeconds);

    return true;

}

export async function checkDailyRateLimit(hashedIp: string): Promise<boolean> {

    const now: number = Date.now();

    const key: string[] = ["ip24hWindow", hashedIp];

    type WindowData = { startTimestamp: number; count: number };

    const entry = await kv.get<WindowData>(key);

    if (!entry.value) {

        const windowData: WindowData = { startTimestamp: now, count: 1 };

        await kv.set(key, windowData, {

            expireIn: config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60 * 1000

        });

        return true;

    }

    const { startTimestamp, count } = entry.value;

    const windowDuration = config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60 * 1000;

    if (now - startTimestamp >= windowDuration) {

        const windowData: WindowData = {
            
            startTimestamp: now,
            
            count: 1
        
        };

        await kv.set(key, windowData, { expireIn: windowDuration });

        return true;

    }

    if (count >= config.MAX_DAILY_WRITES) return false;

    entry.value.count++;

    await kv.set(key, entry.value, {

        expireIn: windowDuration - (now - startTimestamp)

    });

    return true;

}

export async function hashIp(ip: string, salt = config.HASH_KEY): Promise<string> {

    const encoder: TextEncoder = new TextEncoder();

    const data = encoder.encode(ip + salt);

    const hashBuffer: ArrayBuffer = await crypto.subtle.digest("SHA-256", data);
    
    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    
}