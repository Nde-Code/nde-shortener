import { createJsonResponse } from "./http_response.ts";

import { Config } from "../types/types.ts";

export function isConfigValidWithMinValues(config: Config, rules: Partial<Record<keyof Config, number>>): boolean {

    for (const [key, minValue] of Object.entries(rules)) {

        const value = config[key as keyof Config];

        if (typeof value !== "number" || value < (minValue ?? 0)) return false;

    }

    return true;

}

export function extractValidID(path: string): string | Response {

    const id: string = path.split("/")[2];
    
    if (!id) return createJsonResponse({ "error": "URL ID is missing." }, 400);

    else if (!/^[a-zA-Z0-9_-]{5,}$/.test(id)) return createJsonResponse({ error: "Invalid ID format." }, 400);

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

export async function sha256(input: string): Promise<string> {

	const encoder: TextEncoder = new TextEncoder();

	const data: Uint8Array<ArrayBufferLike> = encoder.encode(input);

	const hashBuffer: ArrayBuffer = await crypto.subtle.digest("SHA-256", data);

	return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

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