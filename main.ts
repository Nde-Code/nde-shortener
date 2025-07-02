import { postInFirebaseRTDB } from "./utilities/post.ts";

import { readInFirebaseRTDB } from "./utilities/read.ts";

import { jsonURLFormat, jsonURLMap, JsonURLMapOfFullDB, postBODYType } from "./types/types.ts";

import { parseJsonBody, checkGlobalRateLimit, findUrlKey, isValidUrl, generateRandomString } from "./utilities/small.ts";

import { createJsonResponse } from "./utilities/http_response.ts";

import { config } from "./config.ts";

async function handler(req: Request): Promise<Response> {

	const url: URL = new URL(req.url);

	const pathname: string = url.pathname;

	if (req.method === "OPTIONS") {

		return new Response(null, {

			status: 204,

			headers: {

				"Access-Control-Allow-Origin": "*",

				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",

				"Access-Control-Allow-Headers": "Content-Type",

				"Access-Control-Max-Age": "86400",
				
			},

		});

	}

	if (!checkGlobalRateLimit()) return createJsonResponse({ "error": "Rate limit exceeded: only 1 request per second allowed globally." }, 429, config.ORIGIN_ERROR);

	if (!config.FIREBASE_URL) return createJsonResponse({ "error": "Your Firebase host link is missing. Please check your .env file !" }, 500, config.ORIGIN_ERROR);

	if (!config.FIREBASE_HIDDEN_PATH) return createJsonResponse({ "error": "The secret path for your database is missing. Please check your .env file." }, 500, config.ORIGIN_ERROR);

	if (req.method === "GET" && pathname === "/urls") {

		let data: jsonURLFormat | null = null;

		try {

			data = await readInFirebaseRTDB<jsonURLFormat>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);

		} catch(_err) {

			return createJsonResponse({ "error": "Failed to fetch data from database. Please try again later." }, 500, config.ORIGIN_ERROR);

		}

		return createJsonResponse(data ?? {}, 200, config.ORIGIN_FOR_DB_LIST);

	}

	if (req.method === "GET" && pathname.startsWith("/url/")) {

		const id: string = pathname.split("/")[2];

		let data: jsonURLMap | null = null;

		try {

			data = await readInFirebaseRTDB<jsonURLMap>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);

		} catch(_err) {

			return createJsonResponse({ "error": "Failed to fetch data from database. Please try again later." }, 500, config.ORIGIN_ERROR);

		}

		if (!id) return createJsonResponse({ "error": "URL ID is missing." }, 400, config.ORIGIN_ERROR);

		if (data && Object.prototype.hasOwnProperty.call(data, id)) {

			return new Response(null, {

				status: 302,

				headers: {

					Location: data[id].long_url.toString()

				},

			});

		} else {

			return createJsonResponse({ "error": "This link was not found in the database. Sorry !" }, 404, config.ORIGIN_ERROR);

		}

	}

  	if (req.method === "POST" && pathname === "/post-url") {

		let data: postBODYType | null = null;

		try {

			data = await parseJsonBody<postBODYType>(req);

		} catch(_err) {

			return createJsonResponse({ "error": "Failed to fetch data from database. Please try again later." }, 500, config.ORIGIN_ERROR);

		}

		if (!data) return createJsonResponse({ "error": "The body of the POST request is not valid. Please refer to the documentation before sending the request." }, 400, config.ORIGIN_ERROR);

		if (!data.long_url) return createJsonResponse({ "error": "The field 'long_url' is required but missing." }, 400, config.ORIGIN_ERROR);

		if (!isValidUrl(data.long_url)) return createJsonResponse({ "error": "The provided long_url is not in a valid URL format." }, 400, config.ORIGIN_ERROR);

		let completeDB: JsonURLMapOfFullDB | null = null;

		try {

			completeDB = await readInFirebaseRTDB<JsonURLMapOfFullDB>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);

		} catch(_err) {

			return createJsonResponse({ "error": "Failed to fetch data from database. Please try again later." }, 500, config.ORIGIN_ERROR);

		}

		if (completeDB && Object.keys(completeDB).length > 0) {

			const foundKey = findUrlKey(completeDB, data.long_url);

			if (foundKey !== null) return createJsonResponse({ "error": "The URL is already in the database", link: `${url.origin}/url/${foundKey}` }, 409, config.ORIGIN_ERROR);
		
		}

		const randomLinkString = generateRandomString(10);

		const firebaseData: jsonURLFormat = {

			long_url: data.long_url,

			post_date: new Date().toDateString(),

		};

		const path: string = `/${config.FIREBASE_HIDDEN_PATH}/${randomLinkString}`;

		let result: jsonURLFormat | null = null;

		try {

			result = await postInFirebaseRTDB<jsonURLFormat, jsonURLFormat>(config.FIREBASE_URL, path, firebaseData);

		} catch(_err) {

			return createJsonResponse({ "error": "Failed to fetch data from database. Please try again later." }, 500, config.ORIGIN_ERROR);

		}

		let firebaseResponse: string = "Link hasn't been generated due to an internal server error.";

		if (result && (result.long_url === firebaseData.long_url) && (result.post_date === firebaseData.post_date)) firebaseResponse = `${url.origin}/url/${randomLinkString}`;

		return createJsonResponse({ link: firebaseResponse }, 201, config.ORIGIN_FOR_POST);
	
	}

	return createJsonResponse({ "error": "The requested endpoint is invalid." }, 404, config.ORIGIN_ERROR);

}

Deno.serve(handler);
// curl -X POST http://localhost:8000/post-url -H "Content-Type: application/json" -d "{\"long_url\":\"https://nde-code.github.io\"}"