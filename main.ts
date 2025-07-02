import { postInFirebaseRTDB } from "./utilities/post.ts";

import { readInFirebaseRTDB } from "./utilities/read.ts";

import { jsonURLFormat, jsonURLMap, JsonURLMapOfFullDB } from "./types/types.ts";

import { parseJsonBody, checkGlobalRateLimit, findUrlKey, isValidUrl, generateRandomString } from "./utilities/small.ts";

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

	if (!checkGlobalRateLimit()) {

		return new Response(JSON.stringify({ error: "Rate limit exceeded: only 1 request per second allowed globally." }), {

			status: 429,

			headers: {
				
				"Content-Type": "application/json",

				"Access-Control-Allow-Origin": "*"
			
			},

		});

  	}

	if (!config.FIREBASE_URL) return new Response(JSON.stringify({ "error": "Your Firebase host link is missing. Please check your .env file !" }), { status: 500 });

	if (!config.FIREBASE_HIDDEN_PATH) return new Response(JSON.stringify({ "error": "The secret path for your database is missing. Please check your .env file." }), { status: 500 });

	if (req.method === "GET" && pathname === "/urls") {

		let data: jsonURLFormat | null = null;

		try {

			data = await readInFirebaseRTDB<jsonURLFormat>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);

		} catch(_err) {

			return new Response(JSON.stringify({ "error": "Failed to fetch data from database. Please try again later." }), {

				status: 500,

				headers: {

					"Content-Type": "application/json",

					"Access-Control-Allow-Origin": "*"

				},

			});

		}

		return new Response(JSON.stringify(data), {

			status: 200,

			headers: {
				
				"Content-Type": "application/json",

				"Access-Control-Allow-Origin": "*"
			
			},

		});

	}

	if (req.method === "GET" && pathname.startsWith("/url/")) {

		const id: string = pathname.split("/")[2];

		let data: jsonURLMap | null = null;

		try {

			data = await readInFirebaseRTDB<jsonURLMap>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);

		} catch(_err) {

			return new Response(JSON.stringify({ "error": "Failed to fetch data from database. Please try again later." }), {

				status: 500,

				headers: {

					"Content-Type": "application/json",

					"Access-Control-Allow-Origin": "*"

				},

			});

		}

		if (!id) {

			return new Response(JSON.stringify({ "error": "URL ID is missing." }), {

				status: 400,

				headers: {
					
					"Content-Type": "application/json",
					
					"Access-Control-Allow-Origin": "*"
				
				},

			});

  		}

		if (data && Object.prototype.hasOwnProperty.call(data, id)) {

			return new Response(null, {

				status: 302,

				headers: {

					Location: data[id].long_url.toString()

				},

			});

		} else {

			return new Response(JSON.stringify({ "error": "This link was not found in the database. Sorry !" }), {

				status: 404,

				headers: {
					
					"Content-Type": "application/json",

					"Access-Control-Allow-Origin": "*"
				
				},

			});

		}

	}

  	if (req.method === "POST" && pathname === "/post-url") {

		let data: { long_url: string } | null = null;

		try {

			data = await parseJsonBody<{ long_url: string }>(req);

		} catch(_err) {

			return new Response(JSON.stringify({ "error": "Failed to fetch data from database. Please try again later." }), {

				status: 500,

				headers: {

					"Content-Type": "application/json",

					"Access-Control-Allow-Origin": "*"

				},

			});

		}

		if (!data) return new Response(JSON.stringify({ "error": "The body of the POST request is not valid. Please refer to the documentation before sending the request." }), {
			
			status: 400,

			headers: {
					
				"Content-Type": "application/json",

				"Access-Control-Allow-Origin": "*"
				
			},
		
		});

		if (!data.long_url) return new Response(JSON.stringify({ "error": "The field 'long_url' is required but missing." }), {
			
			status: 400,

			headers: {
					
				"Content-Type": "application/json",

				"Access-Control-Allow-Origin": "*"
				
			},
		
		});

		if (!isValidUrl(data.long_url)) return new Response(JSON.stringify({ "error": "The provided long_url is not in a valid URL format." }), {
			
			status: 400,

			headers: {
					
				"Content-Type": "application/json",

				"Access-Control-Allow-Origin": "*"
				
			},
		
		});

		let completeDB: JsonURLMapOfFullDB | null = null;

		try {

			completeDB = await readInFirebaseRTDB<JsonURLMapOfFullDB>(config.FIREBASE_URL, config.FIREBASE_HIDDEN_PATH);

		} catch(_err) {

			return new Response(JSON.stringify({ "error": "Failed to fetch data from database. Please try again later." }), {

				status: 500,

				headers: {

					"Content-Type": "application/json",

					"Access-Control-Allow-Origin": "*"

				},

			});

		}

		if (completeDB && Object.keys(completeDB).length > 0) {

			const foundKey = findUrlKey(completeDB, data.long_url);

			if (foundKey !== null) return new Response(JSON.stringify({ "error": "The URL is already in the database", link: `${url.origin}/url/${foundKey}` }),{ status: 409, headers: { "Content-Type": "application/json" } });
		
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

			return new Response(JSON.stringify({ "error": "Failed to fetch data from database. Please try again later." }), {

				status: 500,

				headers: {

					"Content-Type": "application/json",

					"Access-Control-Allow-Origin": "*"

				},

			});

		}

		let firebaseResponse: string = "Link hasn't been generated due to an internal server error.";

		if (result && (result.long_url === firebaseData.long_url) && (result.post_date === firebaseData.post_date)) firebaseResponse = `${url.origin}/url/${randomLinkString}`;

		return new Response(JSON.stringify({ link: firebaseResponse }), {
			
			status: 201,
			
			headers: {
				
				"Content-Type": "application/json",

				"Access-Control-Allow-Origin": "*"
			
			}
		
		});
	
	}

	return new Response(JSON.stringify({ "error": "The requested endpoint is invalid." }), {
		
		status: 404,

		headers: {
					
			"Content-Type": "application/json",

			"Access-Control-Allow-Origin": "*"
				
		},
	
	});

}

Deno.serve(handler);
// curl -X POST http://localhost:8000/post-url -H "Content-Type: application/json" -d "{\"long_url\":\"https://nde-code.github.io\"}"