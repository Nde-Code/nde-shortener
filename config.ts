import { Config } from "./types/types.ts";

export const config: Config = {

    FIREBASE_URL: Deno.env.get("FIREBASE_HOST_LINK") ?? "",

    FIREBASE_HIDDEN_PATH: Deno.env.get("FIREBASE_HIDDEN_PATH") ?? "",

    HASH_KEY: Deno.env.get("HASH_KEY") ?? "",
    
    RATE_LIMIT_INTERVAL_MS: 1000,

    DAILY_LIMIT: 10,

    FIREBASE_TIMEOUT: 5000,

    FIREBASE_ENTRIES_LIMIT: 500

};
