import { config } from "../config.ts";

import { printLogLine } from "./utils.ts";

interface CacheEntry { expireAt: number; }

interface WindowData {

    startTimestamp: number; 

    count: number;         
  
}

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

export function checkTimeRateLimit(hashedIp: string, limitSeconds = config.RATE_LIMIT_INTERVAL_S): boolean {

    const cacheKey: string = `ratelimit:${hashedIp}`;

    if (getCache(cacheKey)) return false; 

    setCache(cacheKey, limitSeconds);

    return true;

}

setInterval(() => {

    const now = Date.now();

    for (const [k, v] of cache) {
        
        if (v.expireAt < now) cache.delete(k);
    
    }
    
}, 60_000);

const kv = await Deno.openKv();

async function safeSetKv<T>(key: string[], value: T, expireInMs: number, errorMessage = "KV put failed..."): Promise<boolean> {

    try {

        await kv.set(key, value, { expireIn: expireInMs });

        return true;

    } catch (_err) {

        printLogLine("ERROR", errorMessage)

        return false;

    }

}

export async function checkDailyRateLimit(hashedIp: string): Promise<boolean> {

    const now: number = Date.now();

    const key: string[] = ["ip24hWindow", hashedIp];

    const entry = await kv.get<WindowData>(key);

    const purgeAfter: number = config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60 * 1000;

    const windowDuration: number = 24 * 60 * 60 * 1000; 

    if (!entry.value) {

        const newWindow: WindowData = { startTimestamp: now, count: 1 };

        return await safeSetKv(key, newWindow, purgeAfter, "The KV hasn't been updated to initialize the daily window.");

    }

    const { startTimestamp, count } = entry.value;

    if (now - startTimestamp >= windowDuration) {

        const newWindow: WindowData = { startTimestamp: now, count: 1 };

        return await safeSetKv(key, newWindow, purgeAfter, "The KV hasn't been updated to reset the daily window.");

    }

    if (count >= config.MAX_DAILY_WRITES) return false;

    entry.value.count++;

    return await safeSetKv(key, entry.value, purgeAfter - (now - startTimestamp), "The KV hasn't been updated to increment the daily counter.");

}

export async function hashIp(ip: string, salt = config.HASH_KEY): Promise<string> {

    const encoder: TextEncoder = new TextEncoder();

    const data = encoder.encode(ip + salt);

    const hashBuffer: ArrayBuffer = await crypto.subtle.digest("SHA-256", data);
    
    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    
}
