import { putInFirebaseRTDB } from "./utilities/write.ts";

import { readInFirebaseRTDB } from "./utilities/read.ts";

import { deleteInFirebaseRTDB } from "./utilities/delete.ts";

import { setIsVerifiedTrue, VerificationStatus } from "./utilities/verify.ts";

import { Config, jsonURLFormat, jsonURLMapOfFullDB, postBODYType } from "./types/types.ts";

import { isConfigValidWithMinValues, extractValidID, isValidUrl, sha256, parseJsonBody } from "./utilities/utils.ts";

import { getIp, checkTimeRateLimit, checkDailyRateLimit, hashIp } from "./utilities/rate.ts";

import { createJsonResponse } from "./utilities/http_response.ts";

import { config } from "./config.ts";

import { buildLocalizedMessage, translateKey } from "./utilities/translations.ts";

async function handler(req: Request): Promise<Response> {

	const url: URL = new URL(req.url);

	const pathname: string = url.pathname;

	const hashedIP: string = await hashIp(getIp(req));

	const configMinValues: Partial<Record<keyof Config, number>> = {

		RATE_LIMIT_INTERVAL_S: 1,

		DAILY_LIMIT: 1,

		IPS_PURGE_TIME_DAYS: 1,

		FIREBASE_TIMEOUT_MS: 1000,

		FIREBASE_ENTRIES_LIMIT: 50,

		SHORT_URL_ID_LENGTH: 10,

		MAX_URL_LENGTH: 100

	}

	if (!config.FIREBASE_URL || !config.FIREBASE_HIDDEN_PATH || !config.HASH_KEY || !config.ADMIN_KEY) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'MISSING_CREDENTIALS'), 500);
	
	if (!isConfigValidWithMinValues(config, configMinValues)) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_CONFIG'), 500);

	if (!hashedIP || hashedIP.length !== 64) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_HASH'), 403);

	if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'RATE_LIMIT_EXCEEDED'), 429);

	if (req.method === "OPTIONS") {

		return createJsonResponse({},
		
			204,

			{

				"Access-Control-Allow-Methods": "GET, DELETE, POST, OPTIONS",

				"Access-Control-Allow-Headers": "Content-Type, Authorization",

				"Access-Control-Max-Age": "86400",

			}
		
		);
		
  	}

	if (req.method === "GET" && pathname === "/urls") {

		const apiKey: string | null = url.searchParams.get("apiKey");

		if (apiKey !== config.ADMIN_KEY) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_API_KEY_FOR_URLS_DB'), 401);

		else {

			const data: jsonURLFormat | null = await readInFirebaseRTDB<jsonURLFormat>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);
	
			if (!data) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'NO_URLS_IN_DB'), 200);
	
			else return createJsonResponse(data, 200);

		}

	}

	if (req.method === "GET" && pathname.startsWith("/verify/")) {

		const ID: string | Response = extractValidID(pathname);

		const apiKey: string | null = url.searchParams.get("apiKey");

		if (apiKey !== config.ADMIN_KEY) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_API_KEY_FOR_VERIFICATION'), 401);

		const result: VerificationStatus = await setIsVerifiedTrue(config.FIREBASE_URL, `${config.FIREBASE_HIDDEN_PATH}/${ID}`);

		if (result === "verified_now") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'success', 'LINK_VERIFIED'), 200);	

		else if (result === "already_verified") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'LINK_ALREADY_VERIFIED'), 200);

		else if (result === "not_found") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_LINK_FOUND_WITH_ID_IN_DB'), 404);

	}

	if (req.method === "DELETE" && pathname.startsWith("/delete/")) {

		const ID: string | Response = extractValidID(pathname);
		
		const apiKey: string | null = url.searchParams.get("apiKey");

		if (apiKey !== config.ADMIN_KEY) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_API_KEY_FOR_DELETION'), 401);

		else {

			const data: boolean  = await deleteInFirebaseRTDB(config.FIREBASE_URL, `${config.FIREBASE_HIDDEN_PATH}/${ID}`);

			if (data === true) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'success', 'LINK_DELETED'), 200)
			
			else return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_LINK_FOUND_WITH_ID_IN_DB'), 404);

		}
	
	}

	if (req.method === "GET" && pathname.startsWith("/url/")) {

		const ID: string | Response = extractValidID(pathname);

		const data: jsonURLFormat | null = await readInFirebaseRTDB<jsonURLFormat>(config.FIREBASE_URL, `${config.FIREBASE_HIDDEN_PATH}/${ID}`);

		if (data && data !== null) {

			return new Response(null, {

				status: (data.is_verified === true) ? 302 : 301,

				headers: {

					Location: data.long_url.toString()

				},

			});

		}
		
		else return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_LINK_FOUND_WITH_ID_IN_DB'), 404);
	
	}

  	if (req.method === "POST" && pathname === "/post-url") {

		const data: postBODYType | null = await parseJsonBody<postBODYType>(req);

		if (!data) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'INVALID_POST_BODY'), 400);

		const satanizedURL: string = data.long_url.trim().toLowerCase();

		if (!satanizedURL) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'MISSING_LONG_URL_FIELD'), 400);

		const keys = Object.keys(data as object);

		if (keys.length !== 1 || keys[0] !== "long_url") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'UNEXPECTED_FIELD_IN_BODY'), 400);

		if (!isValidUrl(satanizedURL)) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NOT_A_VALID_URL'), 400);

		if (satanizedURL.length > config.MAX_URL_LENGTH) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'TOO_LONG_URL'), 400);

		const urlKey: string = (await sha256(satanizedURL)).slice(0, config.SHORT_URL_ID_LENGTH);

		const existing: jsonURLFormat | null = await readInFirebaseRTDB<jsonURLFormat>(config.FIREBASE_URL, `/${config.FIREBASE_HIDDEN_PATH}/${urlKey}`);

		if (existing) {

			if (existing.long_url === satanizedURL) return createJsonResponse({ [translateKey(config.LANG_CODE, 'success')]: `${url.origin}/url/${urlKey}` }, 200);
				
			else return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'HASH_COLLISION'), 500);
			
		}

		const completeDB: jsonURLMapOfFullDB | null = await readInFirebaseRTDB<jsonURLMapOfFullDB>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);
		
		if (completeDB && Object.keys(completeDB).length > config.FIREBASE_ENTRIES_LIMIT) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'DB_LIMIT_REACHED'), 507);

		if (!(await checkDailyRateLimit(hashedIP))) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'WRITE_LIMIT_EXCEEDED'), 429);

		const firebaseData: jsonURLFormat = {

			long_url: satanizedURL,

			post_date: new Date().toISOString(),

			is_verified: false

		};

		const result: jsonURLFormat | null = await putInFirebaseRTDB<jsonURLFormat, jsonURLFormat>(config.FIREBASE_URL, `/${config.FIREBASE_HIDDEN_PATH}/${urlKey}`, firebaseData);

		const firebaseResponse: string | null = (result !== null && result.long_url === firebaseData.long_url && result.post_date === firebaseData.post_date && result.is_verified === firebaseData.is_verified) ? `${url.origin}/url/${urlKey}` : null;

		if (firebaseResponse === null) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'LINK_NOT_GENERATED'), 500);

		else return createJsonResponse({ [translateKey(config.LANG_CODE, 'success')]: firebaseResponse }, 201);

	}

	return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'INVALID_API_ENDPOINT'), 404);

}

Deno.serve(handler);