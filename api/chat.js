/**
 * Heavenly AI — Vercel Serverless Function proxy for OpenAI
 *
 * Environment variables (set in the Vercel dashboard or via `vercel env add`):
 *   OPENAI_API_KEY  — your OpenAI secret key  (required)
 *   ALLOWED_ORIGIN  — e.g. "https://heavenly-official.github.io"
 *                     Defaults to "*" (allow all origins) if not set.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL  = 'gpt-4o-mini';

module.exports = async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ── CORS pre-flight ──────────────────────────────────
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(404).json({ error: 'Not found' });
  }

  // ── Parse body ───────────────────────────────────────
  const { messages, model } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // ── Validate API key ─────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Server not configured: missing OPENAI_API_KEY' });
  }

  // ── Forward to OpenAI ────────────────────────────────
  let openaiRes;
  try {
    openaiRes = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:    model || DEFAULT_MODEL,
        messages,
      }),
    });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach OpenAI: ' + err.message });
  }

  // ── Relay the response ───────────────────────────────
  const data = await openaiRes.json();
  return res.status(openaiRes.status).json(data);
};
