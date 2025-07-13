import { config } from "../config.ts";

export async function postInFirebaseRTDB<T = unknown, U = unknown>(FIREBASE_URL: string, path: string, data: U): Promise<T | null> {

    const url: string = `${FIREBASE_URL}${path}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT);

    const res: Response = await fetch(url, {

        method: "PUT",

        headers: {

            "Content-Type": "application/json",

        },

        body: JSON.stringify(data),

    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    return (await res.json()) as T;

}