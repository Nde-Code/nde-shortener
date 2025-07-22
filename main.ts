import { postInFirebaseRTDB } from "./utilities/post.ts";

import { readInFirebaseRTDB } from "./utilities/read.ts";

import { deleteInFirebaseRTDB } from "./utilities/delete.ts";

import { setIsVerifiedTrue, VerificationStatus } from "./utilities/verify.ts";

import { Config, jsonURLFormat, jsonURLMapOfFullDB, postBODYType } from "./types/types.ts";

import { isConfigValidWithMinValues, extractValidID, isValidUrl, sha256, parseJsonBody } from "./utilities/utils.ts";

import { getIp, checkTimeRateLimit, checkDailyRateLimit, hashIp } from "./utilities/rate.ts";

import { createJsonResponse } from "./utilities/http_response.ts";

import { config } from "./config.ts";

async function handler(req: Request): Promise<Response> {

	const url: URL = new URL(req.url);

	const pathname: string = url.pathname;

	const hashedIP: string = await hashIp(getIp(req));

	const configMinValues: Partial<Record<keyof Config, number>> = {

		RATE_LIMIT_INTERVAL_MS: 1000,

		DAILY_LIMIT: 1,

		IPS_PURGE_TIME_DAYS: 1,

		FIREBASE_TIMEOUT: 1000,

		FIREBASE_ENTRIES_LIMIT: 50,

		SHORT_URL_ID_LENGTH: 10,

		MAX_URL_LENGTH: 100

	}

	if (!config.FIREBASE_URL || !config.FIREBASE_HIDDEN_PATH || !config.HASH_KEY) return createJsonResponse({ "error": "Your credentials are missing. Please check your .env file." }, 500);
	
	if (!isConfigValidWithMinValues(config, configMinValues)) return createJsonResponse({ "error": "Invalid configuration detected in your config.ts file. Please refer to the documentation." }, 500);

	if (!hashedIP || hashedIP.length !== 64) return createJsonResponse({ "error": "Unable to hash your IP but it's required for security." }, 403);

	if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse({ "warning": "Rate limit exceeded: only 1 request per second is allowed." }, 429);

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

		const data: jsonURLFormat | null = await readInFirebaseRTDB<jsonURLFormat>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);

		if (!data) return createJsonResponse({"error": "Sorry no url(s) to retreive from the database."}, 200);

		else return createJsonResponse(data, 200);

	}

	if (req.method === "GET" && pathname.startsWith("/verify/")) {

		const ID: string | Response = extractValidID(pathname);

		const apiKey: string | null = url.searchParams.get("apiKey");

		if (apiKey !== config.ADMIN_KEY) return createJsonResponse({ "error": "The API key provided for link verification is incorrect or missing." }, 401);

		const result: VerificationStatus = await setIsVerifiedTrue(config.FIREBASE_URL, `${config.FIREBASE_HIDDEN_PATH}/${ID}`);

		if (result === "verified_now") return createJsonResponse({ "success": "The link has been verified successfully." }, 200);	

		else if (result === "already_verified") return createJsonResponse({ "warning": "This link is already verified." }, 200);

		else if (result === "not_found") return createJsonResponse({ "error": "No record of this link was found in the database." }, 404);

	}

	if (req.method === "DELETE" && pathname.startsWith("/delete/")) {

		const ID: string | Response = extractValidID(pathname);
		
		const apiKey: string | null = url.searchParams.get("apiKey");

		if (apiKey !== config.ADMIN_KEY) return createJsonResponse({"error": "The API key provided for link deletion is incorrect."}, 401);

		else {

			const data: boolean  = await deleteInFirebaseRTDB(config.FIREBASE_URL, `${config.FIREBASE_HIDDEN_PATH}/${ID}`);

			if (data === true) return createJsonResponse({ "success": "The link has been deleted correctly." }, 200)
			
			else return createJsonResponse({ "error": "No record of this link was found in the database." }, 404);

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
		
		else return createJsonResponse({ "error": "No record of this link was found in the database." }, 404);
	
	}

  	if (req.method === "POST" && pathname === "/post-url") {

		const data: postBODYType | null = await parseJsonBody<postBODYType>(req);

		if (!data) return createJsonResponse({ "error": "The body of the POST request is not valid. Please refer to the documentation before sending the request." }, 400);

		const satanizedURL: string = data.long_url.trim().toLowerCase();

		if (!satanizedURL) return createJsonResponse({ "error": "The field 'long_url' is required but missing." }, 400);

		const keys = Object.keys(data as object);

		if (keys.length !== 1 || keys[0] !== "long_url") return createJsonResponse({ "error": "The body contains unexpected field." }, 400);

		if (!isValidUrl(satanizedURL)) return createJsonResponse({ "error": "The provided long_url is not in a valid URL format." }, 400);

		if (satanizedURL.length > config.MAX_URL_LENGTH) return createJsonResponse({ "error": `The URL is too long (${data.long_url.length} characters). Maximum allowed length is ${config.MAX_URL_LENGTH} characters.` }, 400);

		const urlKey: string = (await sha256(satanizedURL)).slice(0, config.SHORT_URL_ID_LENGTH);

		const existing: jsonURLFormat | null = await readInFirebaseRTDB<jsonURLFormat>(config.FIREBASE_URL, `/${config.FIREBASE_HIDDEN_PATH}/${urlKey}`);

		if (existing) {

			if (existing.long_url === satanizedURL) return createJsonResponse({ "link": `${url.origin}/url/${urlKey}` }, 200);
				
			else return createJsonResponse({ "error": "Hash collision detected, please try again." }, 500);
			
		}

		const completeDB: jsonURLMapOfFullDB | null = await readInFirebaseRTDB<jsonURLMapOfFullDB>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);
		
		if (completeDB && Object.keys(completeDB).length > config.FIREBASE_ENTRIES_LIMIT) return createJsonResponse({ "error": "The database has reached the limit of entries." }, 507);

		if (!(await checkDailyRateLimit(hashedIP))) return createJsonResponse({ "warning": "Rate limit exceeded: maximum of 10 write requests allowed per day." }, 429);

		const firebaseData: jsonURLFormat = {

			long_url: satanizedURL,

			post_date: new Date().toISOString(),

			is_verified: false

		};

		const result: jsonURLFormat | null = await postInFirebaseRTDB<jsonURLFormat, jsonURLFormat>(config.FIREBASE_URL, `/${config.FIREBASE_HIDDEN_PATH}/${urlKey}`, firebaseData);

		const firebaseResponse: string = (result !== null && result.long_url === firebaseData.long_url && result.post_date === firebaseData.post_date) ? `${url.origin}/url/${urlKey}` : "Link could not be generated due to an internal server error.";

		return createJsonResponse({ "link": firebaseResponse }, 201);

	}

	return createJsonResponse({ "error": "The requested endpoint is invalid." }, 404);

}

Deno.serve(handler);