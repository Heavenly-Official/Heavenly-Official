# Heavenly AI — Vercel Serverless Function proxy

This serverless function sits between the Heavenly AI frontend and the OpenAI API so that your **API key never appears in the browser or in the git repository**.

```
Browser  →  POST /api/chat  →  Vercel Function  →  OpenAI API
```

---

## Prerequisites

- A free [Vercel account](https://vercel.com/signup) (sign up with GitHub)
- The [Vercel CLI](https://vercel.com/docs/cli) (optional — you can do everything in the dashboard)

```bash
npm install -g vercel
vercel login
```

---

## Deploy in 3 steps

### 1. Import the repo into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → click **Import** next to `heavenly-official.github.io`
2. On the "Configure Project" screen leave all settings at their defaults (Framework: **Other**, Root Directory: `/`)
3. Click **Deploy** — Vercel will build the project and give you a live URL

### 2. Add your OpenAI API key as an environment variable

**Via the dashboard (recommended):**

1. Open your project → **Settings** → **Environment Variables**
2. Add a new variable:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** your key (`sk-…`)
   - **Environments:** Production, Preview, Development
3. *(Optional)* Add a second variable to lock CORS to your domain:
   - **Key:** `ALLOWED_ORIGIN`
   - **Value:** `https://heavenly-official.github.io`
4. Click **Save**, then go to **Deployments** → redeploy to apply the new variables

**Via the CLI:**

```bash
vercel env add OPENAI_API_KEY
vercel env add ALLOWED_ORIGIN
vercel --prod
```

### 3. Update the frontend

Open `ai/ai.js` and replace the placeholder `WORKER_URL` with your Vercel project URL:

```js
const WORKER_URL = 'https://your-project-name.vercel.app/api';
```

The frontend appends `/chat`, so the full call resolves to `/api/chat` — the path Vercel maps to this file. Commit and push.

---

## Local development

```bash
vercel dev
```

This starts a local server (default port 3000) that runs the function at `http://localhost:3000/api/chat`. Set the secret locally first:

```bash
vercel env pull .env.local   # pulls all env vars into a local file
```

---

## How Vercel maps the file

Vercel automatically deploys every file inside `api/` as a serverless function. `api/chat.js` becomes the route `/api/chat` with no extra configuration needed.
