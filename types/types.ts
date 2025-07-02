export interface Config {

    LAST_REQUEST_TIMESTAMP: number;

    RATE_LIMIT_INTERVAL_MS: number;

    FIREBASE_URL: string;

    FIREBASE_HIDDEN_PATH: string;

    FIREBASE_TIMEOUT: number;

    ORIGIN_FOR_DB_LIST: string;

    ORIGIN_FOR_POST: string;

    ORIGIN_ERROR: string;

}

export interface jsonURLFormat {

	long_url: string

	post_date: string

}

export interface jsonURLMap {

  	[id: string]: jsonURLFormat;

}

export type postBODYType = { long_url: string };

export type JsonURLMapOfFullDB = Record<string, { long_url: string; post_date: string }>;