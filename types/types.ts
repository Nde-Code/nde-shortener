export interface Config {

    FIREBASE_URL: string;

    FIREBASE_HIDDEN_PATH: string;

    HASH_KEY: string;

    ADMIN_KEY: string;
    
    RATE_LIMIT_INTERVAL_MS: number;

    DAILY_LIMIT: number;

    FIREBASE_TIMEOUT: number;

    FIREBASE_ENTRIES_LIMIT: number;

    SHORT_URL_ID_LENGTH: number;

}

export interface jsonURLFormat {

	long_url: string

	post_date: string

    is_verified: boolean

}

export type postBODYType = { long_url: string };

export type jsonURLMapOfFullDB = Record<string, { long_url: string; post_date: string, is_verified: boolean }>;