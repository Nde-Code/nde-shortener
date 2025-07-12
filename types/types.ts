export interface Config {

    LAST_REQUEST_TIMESTAMP: number;

    RATE_LIMIT_INTERVAL_MS: number;

    FIREBASE_URL: string;

    FIREBASE_HIDDEN_PATH: string;

    FIREBASE_TIMEOUT: number;

    FIREBASE_ENTRIES_LIMIT: number;

}

export interface jsonURLFormat {

	long_url: string

	post_date: string

}

export type postBODYType = { long_url: string };

export type JsonURLMapOfFullDB = Record<string, { long_url: string; post_date: string }>;