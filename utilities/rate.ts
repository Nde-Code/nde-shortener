import { config } from '../config.ts';

const ipTimestamps = new Map<string, number>();

const ipDailyCounters = new Map<string, { date: string; count: number }>();

export function getIp(req: Request): string {

    return (req.headers.get("x-forwarded-for") || req.headers.get("forwarded") || "unknown");

}

export function checkTimeRateLimit(hashedIp: string): boolean {

    const now: number = Date.now();

    if (ipTimestamps.has(hashedIp)) {

        if ((now - ipTimestamps.get(hashedIp)!) < config.RATE_LIMIT_INTERVAL_MS) return false;

    }

    ipTimestamps.set(hashedIp, now);

    return true;

}

export function checkDailyRateLimit(hashedIp: string): boolean {

    const today: string = new Date().toISOString().slice(0, 10); 

    const record: { date: string; count: number; } | undefined = ipDailyCounters.get(hashedIp);

    if (!record) {

        ipDailyCounters.set(hashedIp, { date: today, count: 1 });

        return true;

    }

    if (record.date !== today) {

        ipDailyCounters.set(hashedIp, { date: today, count: 1 });

        return true;

    }

    if (record.count >= config.DAILY_LIMIT) return false;

    record.count += 1;

    ipDailyCounters.set(hashedIp, record);

    return true;

}

export async function hashIp(ip: string, salt = config.HASH_KEY): Promise<string> {

    const encoder: TextEncoder = new TextEncoder();

    const data: Uint8Array<ArrayBufferLike> = encoder.encode(ip + salt);

    const hashBuffer: ArrayBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

}
