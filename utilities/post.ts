import { config } from "../config.ts";

export async function putInFirebaseRTDB<T = unknown, U = unknown>(FIREBASE_URL: string, path: string, data: U): Promise<T | null> {

    const url: string = `${FIREBASE_URL}${path}.json`;

    const controller: AbortController = new AbortController();

    const timeoutId: number = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT);

    try {

        const res: Response = await fetch(url, {

            method: "PUT",

            headers: {

                "Content-Type": "application/json",

            },

            body: JSON.stringify(data),

            signal: controller.signal

        });

        clearTimeout(timeoutId);

        if (!res.ok) return null;

        return (await res.json()) as T;

    } catch(_err) {

        clearTimeout(timeoutId);

        return null;

    }

}