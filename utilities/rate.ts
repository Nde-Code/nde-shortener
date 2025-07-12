import { config } from '../config.ts'

const ipTimestamps: Map<string, number> = new Map<string, number>();

export function getIp(req: Request): string { return (req.headers.get("x-forwarded-for") || req.headers.get("forwarded") || "unknown"); }

export function checkGlobalRateLimit(hashedIp: string): boolean {

    const now: number = Date.now();

    if (ipTimestamps.has(hashedIp)) {

        if ((now - ipTimestamps.get(hashedIp)!) < config.RATE_LIMIT_INTERVAL_MS) return false;

    }

    ipTimestamps.set(hashedIp, now);
    
    return true;

}

export async function hashIp(ip: string, salt = "monSecret"): Promise<string> {

    const encoder: TextEncoder = new TextEncoder();

    const data: Uint8Array<ArrayBufferLike> = encoder.encode(ip + salt);

    const hashBuffer: ArrayBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

}
