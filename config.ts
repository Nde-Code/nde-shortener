import { Config } from "./types/types.ts";

export const config: Config = {

    FIREBASE_URL: "",

    FIREBASE_HIDDEN_PATH: "",

    HASH_KEY: "",

    ADMIN_KEY: "",

    LANG_CODE: 'en',
    
    RATE_LIMIT_INTERVAL_S: 60,

    MAX_DAILY_WRITES: 10,

    IPS_PURGE_TIME_DAYS: 1,

    FIREBASE_TIMEOUT_MS: 6000,

    FIREBASE_ENTRIES_LIMIT: 500,

    SHORT_URL_ID_LENGTH: 14,

    MAX_URL_LENGTH: 2000

};