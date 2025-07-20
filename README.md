# 🔗 Deno URL Shortener with Firebase RTDB:

A simple and lightweight URL shortener built with [Deno](https://deno.land/) and [Firebase Realtime Database](https://firebase.google.com/products/realtime-database).

> At the beginning, it was my first project using Deno to build a REST API. I kept adding features, and now I'm sharing it publicly on my GitHub.

> I haven't picked a real name for the project yet, so I just called it: `nde-shortener`.

## 📦 Features:

- Security comes first: secrets are stored in a `.env` file, with multiple validations performed before transmission.
- No duplicate URLs (saves space in your database).
- Generate short unique codes for URLs (avoid collisions).
- Redirect users to original URLs.
- Store mappings in Firebase Realtime Database.
- Minimal and fast REST API.
- Written in TypeScript with Deno runtime.
- `is_verified` and `delete` actions implemented.

## 🛡 GDPR Compliance:

This project is designed with **GDPR compliance** in mind:

- ❌ No IP addresses or personal data are stored.  
- ❌ No logging of user activity.  
- ⚠️ Basic rate limiting is implemented using **hashed IP addresses**:  
  - Hashes are used **only in-memory** with [Deno KV](https://docs.deno.com/api/deno/~/Deno.Kv), not persisted or stored in any database.  
  - IP hashes are discarded on server restart.  
- ✅ No tracking, cookies, or analytics.

This ensures that no identifiable user data is collected, stored, or shared in any form.

## 🧰 Tech Stack:

- **Deno** – TypeScript runtime.
- **Firebase RTDB** – Realtime database for storing URLs.
- **Fetch API** – Used for HTTP requests to Firebase.

## 🌐 API Endpoints:

To use this **API endpoints** you can use:

- JavaScript: CORS is `enable` and for all domains `*`.

- CURL: [https://curl.se/](https://curl.se/)

- Postman *(Recommended)*: [https://www.postman.com/](https://www.postman.com/)

### Here’s a complete list of the available methods:
| Method | Endpoint           | Description                                                                 | Request Body                                 | Response                                                                                                                                       |
|--------|--------------------|-----------------------------------------------------------------------------|----------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| POST   | `/post-url`        | Create a short URL from a long one.                                         | `{ "long_url": "https://example.com" }`      | `200 OK`: `{ "link": "https://.../:code" }`  <br> `400 Bad Request`: Invalid body, missing `long_url`, unexpected field, or invalid URL format <br> `429 Too Many Requests`: Rate limit exceeded <br> `507 Insufficient Storage`: Database limit reached |
| GET    | `/urls`            | Retrieve the full list of stored links.                                     | *None*                                       | `200 OK`: `{ [code]: { long_url: string, post_date: string, is_verified: boolean } }` <br> or `No links`                                       |
| GET    | `/url/:code`       | Redirect to the original long URL associated with the short code.           | *None*                                       | `301 Moved Permanently` (if `is_verified = false`) <br> `302 Found` (otherwise) <br> `404 Not Found`: Invalid or unknown code                  |
| GET    | `/verify/:code`    | Mark the URL as verified (`is_verified = true`). **API/ADMIN key required** | *None*                                       | `200 OK`: Verified successfully / Already verified <br> `404 Not Found` <br> `401 Unauthorized`: Invalid API key                               |
| GET    | `/delete/:code`    | Delete a shortened URL from the database. **API/ADMIN key required**     | *None*                                       | `200 OK`: Link deleted <br> `404 Not Found` <br> `401 Unauthorized`: Invalid API key                                                           |
 


## 🚀 Getting Started:

For those who want to create their own instance.

### 1. Clone the project and go in the folder:

```bash
git clone https://github.com/Nde-Code/nde-shortener.git
cd nde-shortener
```

### 2. Create a Firebase Realtime Database to store the links:

1. Go to [firebase.google.com](https://firebase.google.com/) and create an account.  
   > _(If you already have a Google account, you're good to go.)_

2. Create a **project** and set up a `Realtime Database`.

   > 🔍 If you get stuck, feel free to check out the official [Firebase documentation](https://firebase.google.com/docs/build?hl=en), or search on Google, YouTube, etc.

3. Once your database is ready, go to the **`Rules`** tab and paste the following in the editor:
```JSON
{
  
  "rules": {

    "YOUR_SECRET_PATH": {
        
      ".read": true,
          
      "$shortcode": {
          
        ".write": "(!data.exists() && newData.exists()) || (data.exists() && !newData.exists()) || (data.exists() && newData.exists() && data.child('long_url').val() === newData.child('long_url').val() && data.child('post_date').val() === newData.child('post_date').val() && newData.child('is_verified').isBoolean() && newData.hasChild('post_date') && newData.child('long_url').isString() && newData.child('post_date').isString())",
          
        ".validate": "(!newData.exists()) || (newData.child('is_verified').isBoolean() && newData.child('long_url').isString() && newData.child('long_url').val().length <= 2000 && newData.child('long_url').val().matches(/^(ht|f)tp(s?):\\/\\/[0-9a-zA-Z]([\\-\\.\\w]*[0-9a-zA-Z])*(?::[0-9]+)?(\\/.*)?$/) && newData.child('post_date').isString() && newData.child('post_date').val().matches(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$/))",
          
        "long_url": {
              
          ".validate": "newData.isString() && newData.val().length <= 2000 && newData.val().matches(/^(ht|f)tp(s?):\\/\\/[0-9a-zA-Z]([\\-\\.\\w]*[0-9a-zA-Z])*(?::[0-9]+)?(\\/.*)?$/)"
            
        },

        "post_date": {
              
          ".validate": "newData.isString() && newData.val().matches(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$/)"
            
        },

        "is_verified": {
              
          ".validate": "newData.isBoolean()"
              
        },

        "$other": {
              
          ".validate": false
              
        }
        
      }
        
    }
      
  }
  
}
```

### 3. Edit your `.env` file:

```env
FIREBASE_HOST_LINK="YOUR_FIREBASE_URL"
FIREBASE_HIDDEN_PATH="YOUR_SECRET_PATH"
HASH_KEY="THE_KEY_USED_TO_HASH_IPS"
ADMIN_KEY="THE_ADMIN_KEY_TO_DELETE_AND_VERIFY"
```