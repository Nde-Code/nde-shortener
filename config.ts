import { Config } from "./types/types.ts";

export const config: Config = {

    FIREBASE_URL: Deno.env.get("FIREBASE_HOST_LINK") ?? "",

    FIREBASE_HIDDEN_PATH: Deno.env.get("FIREBASE_HIDDEN_PATH") ?? "",

    HASH_KEY: Deno.env.get("HASH_KEY") ?? "",

    ADMIN_KEY: Deno.env.get("ADMIN_KEY") ?? "",

    LANG_CODE: 'en',
    
    RATE_LIMIT_INTERVAL_S: 1,

    DAILY_LIMIT: 10,

    IPS_PURGE_TIME_DAYS: 1,

    FIREBASE_TIMEOUT_MS: 6000,

    FIREBASE_ENTRIES_LIMIT: 500,

    SHORT_URL_ID_LENGTH: 14,

    MAX_URL_LENGTH: 2000

};
