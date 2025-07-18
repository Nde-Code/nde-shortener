import { config } from "../config.ts";

export type VerificationStatus = "already_verified" | "verified_now" | "not_found" | "error";

export async function setIsVerifiedTrue(FIREBASE_URL: string, path: string): Promise<VerificationStatus> {

    const url = `${FIREBASE_URL}${path}.json`;

    const getRes = await fetch(url);

    if (!getRes.ok) return "not_found";

    const currentData = await getRes.json();

    if (!currentData) return "not_found";

    if (currentData?.is_verified === true) return "already_verified";

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT);

    const patchRes = await fetch(url, {

        method: "PATCH",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ is_verified: true }),

        signal: controller.signal,

    });

    clearTimeout(timeoutId);

    return patchRes.ok ? "verified_now" : "error";

}