import { JsonURLMapOfFullDB  } from "../types/types.ts";

import { createJsonResponse } from "./http_response.ts";

export function findUrlKey(data: JsonURLMapOfFullDB, urlToCheck: string): string | null {

    if (!data || Object.keys(data).length === 0) return null;
  
    for (const [key, entry] of Object.entries(data)) {

        if (entry.long_url === urlToCheck) return key;

    }
    
    return null;

}

export function hasAnID(path: string): string | Response {

    const id: string = path.split("/")[2];
    
    if (!id) return createJsonResponse({ "error": "URL ID is missing." }, 200);

    else return id;

}

export function isValidUrl(url: string): boolean {

    try {

        const { protocol, hostname } = new URL(url);

        return ((protocol === "http:" || protocol === "https:") && !hostname.endsWith(".") && hostname.includes(".") && !hostname.split(".").some((label) => label.length === 0) && !["localhost", "127.0.0.1", "::1"].includes(hostname));
    
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

export async function parseJsonBody<T = unknown>(req: Request): Promise<T | null> {

    try {

        const contentType: string = req.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) return null;

        const bodyText: string = await req.text();

        if (!bodyText) return null;

        return JSON.parse(bodyText) as T;

    } catch (_err) {

        return null;

    }

}