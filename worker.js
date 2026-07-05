/**
 * Mesai Takip - Google OAuth Token Exchange Worker
 * Cloudflare Workers'a deploy edilir.
 * client_secret burada güvenli şekilde saklanır, frontend'e gönderilmez.
 *
 * Environment Variables (Cloudflare Dashboard > Settings > Variables):
 *   GOOGLE_CLIENT_ID              = Web Client ID
 *   GOOGLE_CLIENT_SECRET          = Web Client Secret
 *   GOOGLE_DESKTOP_CLIENT_ID      = Desktop Client ID
 *   GOOGLE_DESKTOP_CLIENT_SECRET  = Desktop Client Secret (Secret olarak ekle)
 *   ALLOWED_ORIGIN                = https://mesaitakip.github.io,https://efek0349.github.io
 *                                   (virgülle ayırarak birden fazla origin eklenebilir)
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
];

function getAllowedOrigin(requestOrigin, envOrigin) {
  const prodOrigins = (envOrigin || 'https://mesaitakip.github.io')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (requestOrigin && prodOrigins.some((o) => requestOrigin.startsWith(o))) {
    return requestOrigin;
  }
  if (DEV_ORIGINS.includes(requestOrigin)) return requestOrigin;
  return null;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// client_type'a göre doğru client_id ve client_secret seç
function getClientCredentials(env, clientType) {
  if (clientType === 'desktop') {
    return {
      client_id: env.GOOGLE_DESKTOP_CLIENT_ID,
      client_secret: env.GOOGLE_DESKTOP_CLIENT_SECRET,
    };
  }
  // default: web
  return {
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
  };
}

export default {
  async fetch(request, env) {
    const requestOrigin = request.headers.get('Origin') || '';
    const allowedOrigin = getAllowedOrigin(requestOrigin, env.ALLOWED_ORIGIN);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      if (!allowedOrigin) return new Response('Forbidden', { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!allowedOrigin) {
      return new Response('Forbidden', { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const { code, code_verifier, redirect_uri, grant_type, refresh_token, client_type } = body;

    if (grant_type !== 'authorization_code' && grant_type !== 'refresh_token') {
      return new Response('Invalid grant_type', { status: 400 });
    }

    if (grant_type === 'authorization_code' && (!code || !redirect_uri)) {
      return new Response('Missing required fields', { status: 400 });
    }

    if (grant_type === 'refresh_token' && !refresh_token) {
      return new Response('Missing refresh_token', { status: 400 });
    }

    const { client_id, client_secret } = getClientCredentials(env, client_type);

    const params = new URLSearchParams({
      client_id,
      client_secret,
      grant_type,
    });

    if (grant_type === 'authorization_code') {
      params.set('code', code);
      params.set('redirect_uri', redirect_uri);
      if (code_verifier) params.set('code_verifier', code_verifier);
    } else {
      params.set('refresh_token', refresh_token);
    }

    try {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Google token error:', data.error, data.error_description);
        return new Response(
          JSON.stringify({ error: data.error, error_description: data.error_description }),
          {
            status: response.status,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(allowedOrigin) },
          }
        );
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(allowedOrigin) },
      });

    } catch (error) {
      console.error('Worker fetch error:', error);
      return new Response('Internal Server Error', { status: 500, headers: corsHeaders(allowedOrigin) });
    }
  },
};
