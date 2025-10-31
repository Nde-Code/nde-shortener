# 🛠️ A Cloudflare Workers-compatible version of the project:

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

	"preview_urls": false,

	"observability": {

    "enabled": true,

    "head_sampling_rate": 1,

    "logs": {

      "invocation_logs": false

    },

    "traces": {

      "enabled": false

    }

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
This is the file that exports your main fetch handler.

### **`compatibility_date`**

Locks your Worker to a specific version of the Cloudflare Workers runtime.
This ensures your code continues to work as expected, even if Cloudflare updates the runtime.

### **`preview_urls`**

It’s used to create a previewable URL. That’s a feature in Cloudflare Workers, but it’s not really useful for a small project. Feel free to take a look at: [https://developers.cloudflare.com/workers/configuration/previews/](https://developers.cloudflare.com/workers/configuration/previews/)

## Observability:

### **`observability.enabled`**

When set to `true`, enables **automatic metrics and logs collection** for your Worker.
This lets you monitor performance and errors in the Cloudflare dashboard.

### **`observability.head_sampling_rate`**

Defines the **percentage of requests sampled for tracing** (from `0` to `1`).

* `1` = 100% of requests are sampled (useful for debugging).
* `0.1` = 10% of requests are traced (better for production environments).

### **`observability.logs.invocation_logs`**

Controls whether **automatic invocation logs** are collected for each Worker execution.

* `true` (default) = Cloudflare logs metadata like request method, URL, headers, and execution details.
* `false` = Disables automatic logs, keeping only your custom `console.log` entries.

> Disabling invocation logs is recommended for **GDPR compliance**, as it prevents Cloudflare from storing potentially sensitive request data.

### **`observability.tracing.enabled`**

Controls whether **distributed tracing** is enabled for your Worker.

* `true` = Enables tracing spans and trace IDs for each request (requires compatible tracing backend).
* `false` = Disables tracing entirely.

> Tracing is disabled by default. If you're not using OpenTelemetry or a tracing system, leave this off to reduce data collection.

## KV Namespaces:

### **`kv_namespaces`**

Binds your Worker to your **Cloudflare KV (Key-Value)** namespace.

Create a Workers KV via the dashboard or using:
```bash
wrangler kv namespace create YOUR_KV_NAME
```

> If you feel stuck, take a look at: [https://developers.cloudflare.com/kv/get-started/](https://developers.cloudflare.com/kv/get-started/)

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

> Be sure that your `wrangler.jsonc` is correctly configured before running this command.

⚠️ **Note:** When you’ve configured environment variables, this command may sometimes include your secrets directly in the generated type file. Be very careful, so always review this file (`worker-configuration.d.ts`) before committing or sharing your code. This file has been added to `.gitignore` and is excluded from the source tree in VS Code by default. (1)

and put in `tsconfig.json`: 

> already done, if you've cloned the project so you don't need to do that.

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
  "include": ["utilities", "worker-configuration.d.ts", "main.ts", "config.ts", "types"],
  "exclude": ["node_modules", "dist"]
}
```

Here's a brief summary of what the `tsconfig.json` file do:

* **`noEmit: true`**
  Prevents TypeScript from emitting compiled JS files locally. The build and bundling is handled by **Wrangler/esbuild**, so this is only for type checking.

* **`allowImportingTsExtensions: true`**
  Allows importing `.ts` files directly, which is required for Deno-style and relative imports.

* **`target: "ES2020"`**
  Uses modern JavaScript syntax supported by the Worker runtime.

* **`lib: ["ES2020", "DOM"]`**
  Includes modern JS features (`ES2020`) and standard Web APIs (`DOM`) like `fetch`, `Request`, and `Response`.

* **`module: "ESNext"`**
  Uses ES Modules, which is the standard for Workers and modern TypeScript projects.

* **`moduleResolution: "Node"`**
  Tells TypeScript/IDE how to resolve modules.

  * Not strictly needed for relative `.ts` imports (they work anyway).
  * Useful if you later add npm packages: TypeScript and VS Code will correctly locate modules.
  * Does **not affect the final bundle**; esbuild handles module resolution.

* **`strict: true`**
  Enables all strict type checking options for safer, more predictable code.

* **`esModuleInterop: true`**
  Facilitates interoperability with CommonJS modules if needed.

* **`skipLibCheck: true`**
  Skips type checking for `.d.ts` files in dependencies to speed up compilation.

* **`forceConsistentCasingInFileNames: true`**
  Prevents file casing errors across different operating systems.

* **`types: ["./worker-configuration.d.ts"]`**
  Includes type definitions for Wrangler bindings (KV, R2, Durable Objects, etc.).

* **`include`**
  Files/folders that TypeScript will type check: project source code and types.

* **`exclude`**
  Ignored folders: build artifacts (`dist`), dependencies (`node_modules`).

This project doesn't rely on any external libraries or dependencies, so there's no `package.json` or npm-related files.

## Merge original Deno source code to make it Wrangler-compatible:

Let's briefly summarize how the code was adapted for compatibility with Cloudflare Workers.

- 1. The `.serve()` method needs to be replaced:
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
- 2. Create an `Env` type (see point 1 to understand why we define our own type):
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

Then remove `Deno.env.get(...)` and replace it with `""` in `config.ts` (see it [here](config.ts)).

- 3. The `utilities/rate.ts` file is the only one that **has been completely rewritten**.  
You likely won't need to make any further changes to it.  
If you'd like to review it, you can find it here: [utilities/rate.ts](utilities/rate.ts).
To complete, replace each of the following lines:
```js
if (!(await checkTimeRateLimit(hashedIP)))
if (!(await checkDailyRateLimit(hashedIP)))
```

by:
```js
if (!(await checkTimeRateLimit(env.YOUR_KV_NAME, hashedIP)))
if (!(await checkDailyRateLimit(env.YOUR_KV_NAME, hashedIP)))
```

- 4. A minor change needs to be made: a type fix in `utilities/verify.ts`.
 
- 5. To retrieve the IP address in Cloudflare Workers, use the following code:
```ts
const ip: string = req.headers.get("cf-connecting-ip") ?? "unknown";
```
You can check: [https://community.cloudflare.com/t/ip-address-of-the-remote-origin-of-the-request/13080/3](https://community.cloudflare.com/t/ip-address-of-the-remote-origin-of-the-request/13080/3) for more information.

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

# 🧩 To finish:

If you encounter any issues or problems, feel free top open an issue: [https://github.com/Nde-Code/nde-shortener/issues](https://github.com/Nde-Code/nde-shortener/issues)
