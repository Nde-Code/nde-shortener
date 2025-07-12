import { postInFirebaseRTDB } from "./utilities/post.ts";

import { readInFirebaseRTDB } from "./utilities/read.ts";

import { jsonURLFormat, JsonURLMapOfFullDB, postBODYType } from "./types/types.ts";

import { parseJsonBody, checkGlobalRateLimit, findUrlKey, isValidUrl, generateRandomString } from "./utilities/small.ts";

import { createJsonResponse } from "./utilities/http_response.ts";

import { config } from "./config.ts";

async function handler(req: Request): Promise<Response> {

	const url: URL = new URL(req.url);

	const pathname: string = url.pathname;

	if (!checkGlobalRateLimit()) return createJsonResponse({ "error": "Rate limit exceeded: only 1 request per second allowed globally." }, 429);

	if (!config.FIREBASE_URL || !config.FIREBASE_HIDDEN_PATH) return createJsonResponse({ "error": "Your Firebase credentials are missing. Please check your .env file." }, 500);

	if (req.method === "OPTIONS") createJsonResponse({"error": "CORS is disabled for this API, sorry..."}, 204)

	if (req.method === "GET" && pathname === "/urls") {

		const data: jsonURLFormat | null = await readInFirebaseRTDB<jsonURLFormat>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);

		if (data && data !== null) return createJsonResponse(data ?? {}, 200);

		else return createJsonResponse({"error": "Sorry no url(s) to retreive from the database."}, 204);

	}

	if (req.method === "GET" && pathname.startsWith("/url/")) {

		const id: string = pathname.split("/")[2];

		if (!id) return createJsonResponse({ "error": "URL ID is missing." }, 200);

		const data: jsonURLFormat | null = await readInFirebaseRTDB<jsonURLFormat>(config.FIREBASE_URL, `${config.FIREBASE_HIDDEN_PATH}/${id}`);

		if (data && data !== null) {

			return new Response(null, {

				status: 302,

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

		if (!isValidUrl(data.long_url)) return createJsonResponse({ "error": "The provided long_url is not in a valid URL format." }, 400);

		const completeDB: JsonURLMapOfFullDB | null = await readInFirebaseRTDB<JsonURLMapOfFullDB>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);

		if (completeDB && Object.keys(completeDB).length > 0) {

			const foundKey = findUrlKey(completeDB, data.long_url);

			if (foundKey !== null) return createJsonResponse({ "error": "The URL is already in the database", link: `${url.origin}/url/${foundKey}` }, 409);
		
		}

		if (completeDB && Object.keys(completeDB).length > config.FIREBASE_ENTRIES_LIMIT) return createJsonResponse({ "error": "The database has reached the limit of entries." }, 507);

		const randomLinkString = generateRandomString(10);

		const firebaseData: jsonURLFormat = {

			long_url: data.long_url,

			post_date: new Date().toISOString(),

		};

		const path: string = `/${config.FIREBASE_HIDDEN_PATH}/${randomLinkString}`;

		let result: jsonURLFormat | null = null;

		try {

			result = await postInFirebaseRTDB<jsonURLFormat, jsonURLFormat>(config.FIREBASE_URL, path, firebaseData);

		} catch(_err) {

			return createJsonResponse({ "error": "Failed to POST data to the database. Please try again later." }, 500);

		}

		const firebaseResponse: string = (result && result.long_url === firebaseData.long_url && result.post_date === firebaseData.post_date) ? `${url.origin}/url/${randomLinkString}` : "Link could not be generated due to an internal server error.";

		return createJsonResponse({ link: firebaseResponse }, 201);
	
	}

	return createJsonResponse({ "error": "The requested endpoint is invalid." }, 404);

}

Deno.serve(handler);
// curl -X POST http://localhost:8000/post-url -H "Content-Type: application/json" -d "{\"long_url\":\"https://nde-code.github.io\"}"