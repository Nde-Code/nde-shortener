import { JsonURLMapOfFullDB  } from "../types/types.ts";
import { config } from '../config.ts'

export function findUrlKey(data: JsonURLMapOfFullDB, urlToCheck: string): string | null {

    if (!data || Object.keys(data).length === 0) return null;
  
    for (const [key, entry] of Object.entries(data)) {

        if (entry.long_url === urlToCheck) return key;

    }
    
    return null;

}

export function isValidUrl(url: string): boolean {

    try {

        const parsed: URL = new URL(url);

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

        if (parsed.hostname.endsWith(".")) return false;

        if (!parsed.hostname.includes(".")) return false;

        if (parsed.hostname.split('.').some(label => label.length === 0)) return false;

        return true;

    } catch {

        return false;

    }

}

export function generateRandomString(length: number): string {

    const chars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    let result: string = '';

    for (let i = 0; i < length; i++) {

        const randomIndex: number = Math.floor(Math.random() * chars.length);

        result += chars[randomIndex];

    }

    return result;

}

export function checkGlobalRateLimit(): boolean {

    const now: number = Date.now();

    if (now - config.LAST_REQUEST_TIMESTAMP < config.RATE_LIMIT_INTERVAL_MS) return false;

    config.LAST_REQUEST_TIMESTAMP = now;

    return true; 

}

export async function parseJsonBody<T = unknown>(req: Request): Promise<T | null> {

    try {

        const contentType: string = req.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) return null;

        const bodyText: string = await req.text();

        if (!bodyText) return null;

        return JSON.parse(bodyText) as T;

    } catch (err) {

        console.error("Failed to parse JSON body:", err);

        return null;

    }

}