# Heavenly AI — Cloudflare Worker proxy

This worker sits between the Heavenly AI frontend and the OpenAI API so that your **API key never appears in the browser or in the git repository**.

```
Browser  →  POST /chat  →  Cloudflare Worker  →  OpenAI API
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (for `wrangler`)
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)

```bash
npm install -g wrangler
wrangler login
```

---

## Deploy in 3 steps

### 1. Deploy the worker

```bash
cd cloudflare-worker
wrangler deploy
```

Cloudflare will print a URL like:
```
https://heavenly-ai-proxy.<your-subdomain>.workers.dev
```

### 2. Set your OpenAI API key as a secret

```bash
wrangler secret put OPENAI_API_KEY
```

Paste your OpenAI key when prompted. It is stored encrypted in Cloudflare — it never touches this repo.

### 3. Update the frontend

Open `ai/ai.js` and replace the placeholder `WORKER_URL` constant at the top with the URL you got in step 1:

```js
const WORKER_URL = 'https://heavenly-ai-proxy.<your-subdomain>.workers.dev';
```

Commit and push — done!

---

## Optional: lock CORS to your domain

In `wrangler.toml` the `ALLOWED_ORIGIN` variable is already set to `https://heavenly-official.github.io`. If you're using a custom domain, update it there and redeploy.

---

## Local development

```bash
wrangler dev
```

Set the secret locally for testing:

```bash
echo "sk-..." | wrangler secret put OPENAI_API_KEY --local
```
