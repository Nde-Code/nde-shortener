import { Config } from "./types/types.ts";

export const config: Config = {

    LAST_REQUEST_TIMESTAMP: 0,

    RATE_LIMIT_INTERVAL_MS: 1000,

    FIREBASE_URL: Deno.env.get("FIREBASE_HOST_LINK") ?? "",

    FIREBASE_HIDDEN_PATH: Deno.env.get("FIREBASE_HIDDEN_PATH") ?? "",

};
