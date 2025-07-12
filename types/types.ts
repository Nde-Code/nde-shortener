export interface Config {

    FIREBASE_URL: string;

    FIREBASE_HIDDEN_PATH: string;
    
    RATE_LIMIT_INTERVAL_MS: number;

    DAILY_LIMIT: number;

    FIREBASE_TIMEOUT: number;

    FIREBASE_ENTRIES_LIMIT: number;

}

export interface jsonURLFormat {

	long_url: string

	post_date: string

}

export type postBODYType = { long_url: string };

export type JsonURLMapOfFullDB = Record<string, { long_url: string; post_date: string }>;