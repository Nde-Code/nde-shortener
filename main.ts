import { postInFirebaseRTDB } from "./utilities/post.ts";

import { readInFirebaseRTDB } from "./utilities/read.ts";

import { deleteInFirebaseRTDB } from "./utilities/delete.ts";

import { setIsVerifiedTrue, VerificationStatus } from "./utilities/verify.ts";

import { jsonURLFormat, jsonURLMapOfFullDB, postBODYType } from "./types/types.ts";

import { parseJsonBody, isValidUrl, extractValidID, sha256 } from "./utilities/utils.ts";

import { getIp, hashIp, checkTimeRateLimit, checkDailyRateLimit } from "./utilities/rate.ts";

import { createJsonResponse } from "./utilities/http_response.ts";

import { config } from "./config.ts";

async function handler(req: Request): Promise<Response> {

	const url: URL = new URL(req.url);

	const pathname: string = url.pathname;

	const hashedIP: string = await hashIp(getIp(req));

	if (!config.FIREBASE_URL || !config.FIREBASE_HIDDEN_PATH || !config.HASH_KEY) return createJsonResponse({ "error": "Your credentials are missing. Please check your .env file." }, 500);
	
	if (!checkTimeRateLimit(hashedIP)) return createJsonResponse({ "warning": "Rate limit exceeded: only 1 request per second is allowed." }, 429);

	if (req.method === "OPTIONS") {

		return createJsonResponse({},
		
			204,

			{

				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",

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

		else if (result === "already_verified") return createJsonResponse({ "warning": "This link was already verified." }, 200);

		else if (result === "not_found") return createJsonResponse({ "error": "This link was not found in the database." }, 404);

	}

	if (req.method === "DELETE" && pathname.startsWith("/delete/")) {

		const ID: string | Response = extractValidID(pathname);
		
		const apiKey: string | null = url.searchParams.get("apiKey");

		if (apiKey !== config.ADMIN_KEY) return createJsonResponse({"error": "The API key provided for link deletion is incorrect."}, 401);

		else {

			const data: boolean  = await deleteInFirebaseRTDB(config.FIREBASE_URL, `${config.FIREBASE_HIDDEN_PATH}/${ID}`);

			if (data === true) return createJsonResponse({ "success": "The link has been deleted correctly." }, 200)
			
			else return createJsonResponse({ "error": "This link was not found in the database. Sorry !" }, 404);

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
		
		else return createJsonResponse({ "error": "This link was not found in the database. Sorry !" }, 404);
	
	}

  	if (req.method === "POST" && pathname === "/post-url") {

		const data: postBODYType | null = await parseJsonBody<postBODYType>(req);

		if (!data) return createJsonResponse({ "error": "The body of the POST request is not valid. Please refer to the documentation before sending the request." }, 400);

		if (!data.long_url) return createJsonResponse({ "error": "The field 'long_url' is required but missing." }, 400);

		const keys = Object.keys(data as object);

		if (keys.length !== 1 || keys[0] !== "long_url") return createJsonResponse({ "error": "The body contains unexpected field." }, 400);

		if (!isValidUrl(data.long_url)) return createJsonResponse({ "error": "The provided long_url is not in a valid URL format." }, 400);

		const urlKey: string = (await sha256(data.long_url)).slice(0, config.SHORT_URL_ID_LENGTH);

		const existing: jsonURLFormat | null = await readInFirebaseRTDB<jsonURLFormat>(config.FIREBASE_URL, `/${config.FIREBASE_HIDDEN_PATH}/${urlKey}`);

		if (existing) {

			if (existing.long_url === data.long_url) return createJsonResponse({ "link": `${url.origin}/url/${urlKey}` }, 200);
				
			else return createJsonResponse({ "error": "Hash collision detected, please try again." }, 500);
			
		}

		const completeDB: jsonURLMapOfFullDB | null = await readInFirebaseRTDB<jsonURLMapOfFullDB>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);
		
		if (completeDB && Object.keys(completeDB).length > config.FIREBASE_ENTRIES_LIMIT) return createJsonResponse({ "error": "The database has reached the limit of entries." }, 507);

		if (!checkDailyRateLimit(hashedIP)) return createJsonResponse({ "warning": "Rate limit exceeded: maximum of 10 write requests allowed per day." }, 429);

		const firebaseData: jsonURLFormat = {

			long_url: data.long_url,

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