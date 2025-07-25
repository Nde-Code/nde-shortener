import { config } from "../config.ts";

export async function deleteInFirebaseRTDB(FIREBASE_URL: string, path: string): Promise<boolean> {

    const url = `${FIREBASE_URL}${path}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT_MS);

    try {

        const res = await fetch(url, {

            method: "DELETE",

            signal: controller.signal

        });

        return res.ok;

    } catch (_err) {

        return false;

    } finally {

        clearTimeout(timeoutId);

    }

}
