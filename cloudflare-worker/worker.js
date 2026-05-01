/**
 * Heavenly AI — Cloudflare Worker proxy for OpenAI
 *
 * Secrets required (set via `wrangler secret put` or the Cloudflare dashboard):
 *   OPENAI_API_KEY   — your OpenAI secret key
 *
 * Optional environment variables (set in wrangler.toml [vars] or dashboard):
 *   ALLOWED_ORIGIN   — e.g. "https://heavenly-official.github.io"
 *                      Defaults to "*" (allow all origins) if not set.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL  = 'gpt-4o-mini';

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    // ── CORS pre-flight ──────────────────────────────────
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, allowedOrigin);
    }

    // Only accept POST /chat
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/chat') {
      return corsResponse(JSON.stringify({ error: 'Not found' }), 404, allowedOrigin);
    }

    // ── Parse body ───────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400, allowedOrigin);
    }

    const { messages, model } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return corsResponse(JSON.stringify({ error: 'messages array required' }), 400, allowedOrigin);
    }

    // ── Validate API key ─────────────────────────────────
    if (!env.OPENAI_API_KEY) {
      return corsResponse(JSON.stringify({ error: 'Worker not configured: missing OPENAI_API_KEY secret' }), 500, allowedOrigin);
    }

    // ── Forward to OpenAI ────────────────────────────────
    let openaiRes;
    try {
      openaiRes = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: model || DEFAULT_MODEL,
          messages,
        }),
      });
    } catch (err) {
      return corsResponse(JSON.stringify({ error: 'Failed to reach OpenAI: ' + err.message }), 502, allowedOrigin);
    }

    // ── Relay the response ───────────────────────────────
    const data = await openaiRes.json();
    return corsResponse(JSON.stringify(data), openaiRes.status, allowedOrigin);
  },
};

function corsResponse(body, status, allowedOrigin) {
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  return new Response(body, { status, headers });
}
