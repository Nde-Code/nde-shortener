import { Config } from "./types/types.ts";

export const config: Config = {

    FIREBASE_URL: Deno.env.get("FIREBASE_HOST_LINK") ?? "",

    FIREBASE_HIDDEN_PATH: Deno.env.get("FIREBASE_HIDDEN_PATH") ?? "",
    
    RATE_LIMIT_INTERVAL_MS: 5000,

    FIREBASE_TIMEOUT: 5000,

    FIREBASE_ENTRIES_LIMIT: 500

};
