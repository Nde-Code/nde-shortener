# 🛠️ A Cloudflare Workers-compatible version of the project

This branch contains source code compatible with Cloudflare Workers.

Go to **main** via: [https://github.com/Nde-Code/nde-shortener](https://github.com/Nde-Code/nde-shortener)

And **cf-workers**: [https://github.com/Nde-Code/nde-shortener/tree/cf-workers](https://github.com/Nde-Code/nde-shortener/tree/cf-workers)

The project is now hosted at [https://nsh.nde-code.workers.dev/](https://nsh.nde-code.workers.dev/), and the updated privacy policy can be found at [privacy.md](privacy.md).

# 🚀 To begin working with this version:

- 1. Create or login to your cloudflare account: [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)

- 2. Install Node.js and npm (I've used [Volta](https://volta.sh/Volta) on WSL): [https://nodejs.org/fr/download](https://nodejs.org/fr/download)

- 3. Install the Wrangler CLI using:
```bash
npm install -g wrangler
```

> If you haven't installed Wrangler globally, you'll need to prefix commands with `npx`, like `npx wrangler`.

- 4. Clone the project branch:
```bash
git clone --branch cf-workers --single-branch https://github.com/Nde-Code/nde-shortener.git
```

- 5. Log your Wrangler CLI to your Cloudflare account using:
```bash
wrangler login
```
> Make sure to do this securely on a trusted network.

# ⚙️ Setting up the configuration:

First, create the `wrangler.jsonc` file, which contains the full configuration for your project. It should look like this:
```js
{

	"name": "project_name",

	"main": "main.ts",

	"compatibility_date": "2025-10-08",

	"observability": {

		"enabled": true,

		"head_sampling_rate": 1

	},

	"kv_namespaces": [

		{

			"binding": "YOUR_KV_NAME",

			"id": "YOUR_KV_ID"

		}

	],

	"vars": {

		"FIREBASE_HOST_LINK": "YOUR_FIREBASE_URL",

		"FIREBASE_HIDDEN_PATH": "YOUR_SECRET_PATH",

		"HASH_KEY": "THE_KEY_USED_TO_HASH_IPS",

		"ADMIN_KEY": "THE_ADMIN_KEY_TO_DELETE_AND_VERIFY"

	}

}
``` 

## Main elements:

### **`name`**

Defines the **name of your Worker project**.
This determines the public URL for your Worker on Cloudflare (for example:
`https://project_name.username.workers.dev`).

### **`main`**

Specifies the **entry point** of your Worker script.
This is the file that exports your main fetch handler — for example, `main.ts` or `index.js`.

### **`compatibility_date`**

Locks your Worker to a specific version of the Cloudflare Workers runtime.
This ensures your code continues to work as expected, even if Cloudflare updates the runtime.

## Observability:

### **`observability.enabled`**

When set to `true`, enables **automatic metrics and logs collection** for your Worker.
This lets you monitor performance and errors in the Cloudflare dashboard.

### **`observability.head_sampling_rate`**

Defines the **percentage of requests sampled for tracing** (from `0` to `1`).

* `1` = 100% of requests are sampled (useful for debugging).
* `0.1` = 10% of requests are traced (better for production environments).

## KV Namespaces:

### **`kv_namespaces`**

Binds your Worker to your **Cloudflare KV (Key-Value)** namespace.

Create a Workers KV via the dashboard or using:
```bash
wrangler kv namespace create YOUR_KV_NAME
```

> To create a KV follow: [https://developers.cloudflare.com/kv/get-started/](https://developers.cloudflare.com/kv/get-started/)

And complete the `wrangler.jsonc` file with the following configuration:

* **`binding`** → The variable name you’ll use inside your code (here: `YOUR_KV_NAME`).
* **`id`** → The unique namespace ID from your Cloudflare dashboard.

## Environment Variables:

### **`vars`**

Defines global environment variables accessible inside your Worker via the `env` object.

**List of variables in this project:**

| Variable               | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| `FIREBASE_HOST_LINK`   | The public or private Firebase endpoint used by your Worker.          |
| `FIREBASE_HIDDEN_PATH` | A hidden or secure subpath for sensitive Firebase operations.         |
| `HASH_KEY`             | The cryptographic key used to hash user IPs or sensitive identifiers. |
| `ADMIN_KEY`            | A private admin key used to verify or delete data.          |

⚠️ **Note:** Values defined in `vars` are stored **in plaintext** when you deploy with `vars` in `wrangler.jsonc`. For sensitive information, use **Wrangler Secrets** instead:

```bash
wrangler secret put FIREBASE_HOST_LINK
wrangler secret put FIREBASE_HIDDEN_PATH
wrangler secret put HASH_KEY
wrangler secret put ADMIN_KEY
```

> Check out [https://developers.cloudflare.com/workers/configuration/secrets/](https://developers.cloudflare.com/workers/configuration/secrets/) to learn how to use the command.

And make sure to **comment out the `vars` key** before deploying to Cloudflare.

# 🧰 Code adjustments for Wrangler compatibility:

Cloudflare Workers use the V8 isolate engine to run applications. They don’t use traditional Node.js runtimes like Deno, Node.js, or Bun under the hood. Therefore, to make this project compatible, every use of `Deno.*` must be replaced with an equivalent API that works in the Cloudflare Workers environment.

This section explains how the code was transformed to be compatible with Cloudflare Workers.

## First, initialize TypeScript types

To benefit from TypeScript definitions in your editor and avoid compilation errors, you can add the Cloudflare Workers type definitions by running:

```bash
wrangler types
```

and put in the `tsconfig.json`: 

> Already done, if you've cloned the project, you don't need to do that.

```json
{
  "compilerOptions": {
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["./worker-configuration.d.ts"]
  },
  "include": ["src", "utilities", "worker-configuration.d.ts"],
  "exclude": ["node_modules", "dist"]
}
```

this is the minimum TypeScript configuration required to make the project work.

> If you've cloned the project, you don't need to do that.

⚠️ **Note:** When you’ve configured environment variables, this command may sometimes include your secrets directly in the generated type file. Be very careful, so always review this file (`worker-configuration.d.ts`) before committing or sharing your code. (1)

## Replacing `Deno.*` in the Original Code:

Let's briefly summarize how the code was adapted for compatibility with Cloudflare Workers.

1. The `.serve()` method needs to be replaced:
```ts
Deno.serve(handler);
```
by:
```ts
export default {

	async fetch(req: Request, env: Env): Promise<Response> {

		return handler(req, env);

	}

};
```
- 2. Create a Env type (see (1) to understand why):
```ts
 export interface Env {

    FIREBASE_HOST_LINK: string;

    FIREBASE_HIDDEN_PATH: string;

    ADMIN_KEY: string;

    HASH_KEY: string;

    RATE_LIMIT_KV: KVNamespace;
    
}
```

in the `types/types.ts` file, define your types and import them into `main.ts`.
Then, set your variables inside the `handler` function with `env`:

```ts
async function handler(req: Request, env: Env): Promise<Response> {

	config.FIREBASE_URL = env.FIREBASE_HOST_LINK ?? "";

    config.FIREBASE_HIDDEN_PATH = env.FIREBASE_HIDDEN_PATH ?? "";

    config.ADMIN_KEY = env.ADMIN_KEY ?? "";

    config.HASH_KEY = env.HASH_KEY ?? "";

	// ...

}
``` 

then remove: `Deno.env.get(...)` in `config.ts`.

- 3. The `utilities/rate.ts` file is the only one that **has been completely rewritten**.  
You likely won't need to make any further changes to it.  
If you'd like to review it, you can find it here: [utilities/rate.ts](utilities/rate.ts)

- 4. A few minor changes were made as well—mostly trivial adjustments, such as a type fix in `utilities/verify.ts`.  
These changes were straightforward and don't require further explanation.

# 📌 Run the project and deploy it once it's ready:

To run locally, run:

```bash
wrangler dev
```

> If everything works correctly, that indicates your code is now compatible with Cloudflare Workers.

To bundle the project before deploying, run:

```bash
wrangler build
```

And in the end, to deploy in the Workers network, run:

```bash
wrangler deploy
```

and your project is now deployed and accessible to anyone with the link.

# ✅ To finish:

If you encounter any issues or problems, feel free top open an issue: [https://github.com/Nde-Code/nde-shortener/issues](https://github.com/Nde-Code/nde-shortener/issues)
