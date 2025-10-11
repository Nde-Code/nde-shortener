import { config } from "../config.ts";

export async function checkTimeRateLimit(kv: KVNamespace, hashedIp: string): Promise<boolean> {

    const now: number = Date.now();

    const key: string = `ipTimestamp:${hashedIp}`;

    const rawValue: string | null = await kv.get(key);

    const value: number | null = (typeof rawValue === 'string') ? Number(rawValue) : null;

    if (value && now - value < config.RATE_LIMIT_INTERVAL_S * 1000) return false;

    await kv.put(key, now.toString(), { expirationTtl: config.RATE_LIMIT_INTERVAL_S });

    return true;

}

export async function checkDailyRateLimit(kv: KVNamespace, hashedIp: string): Promise<boolean> {

    const now: number = Date.now();

    const key: string = `ip24hWindow:${hashedIp}`;

    type WindowData = { startTimestamp: number; count: number };

    const json = await kv.get(key);

    let windowData: WindowData;

    if (!json) {

        windowData = { startTimestamp: now, count: 1 };
        
        await kv.put(key, JSON.stringify(windowData), { expirationTtl: config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60 });
        
        return true;

    }

    windowData = JSON.parse(json);

    const windowLength = config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60 * 1000;

    if (now - windowData.startTimestamp >= windowLength) {

        windowData = { startTimestamp: now, count: 1 };

        await kv.put(key, JSON.stringify(windowData), { expirationTtl: config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60 });

        return true;

    }

    if (windowData.count >= config.MAX_DAILY_WRITES) return false;

    windowData.count++;

    const remainingTtl = Math.floor((windowLength - (now - windowData.startTimestamp)) / 1000);

    await kv.put(key, JSON.stringify(windowData), { expirationTtl: remainingTtl });

    return true;
    
}

export async function hashIp(ip: string, salt = config.HASH_KEY): Promise<string> {

    const encoder = new TextEncoder();

    const data = encoder.encode(ip + salt);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    
}
