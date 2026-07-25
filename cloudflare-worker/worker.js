/**
 * RollerCoin Calculator — CORS proxy worker (optional but recommended)
 *
 * Why: rollercoin.com's API sends duplicate Access-Control-Allow-Origin
 * headers, which browsers reject. This tiny Cloudflare Worker fetches the
 * public API server-side and returns clean CORS headers.
 *
 * Deploy (free tier is plenty):
 *   1. npm i -g wrangler && wrangler login
 *   2. wrangler deploy cloudflare-worker/worker.js --name rc-proxy --compatibility-date 2026-07-25
 *   3. Paste the worker URL into assets/js/config.js -> CONFIG.workerProxy
 *
 * Only GET requests to https://rollercoin.com/api/* are proxied.
 */

const ALLOWED_PREFIX = "https://rollercoin.com/api/";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const target = url.searchParams.get("url");
    if (!target || !target.startsWith(ALLOWED_PREFIX)) {
      return jsonResponse({ error: "Only rollercoin.com/api/* GET URLs are allowed" }, 400);
    }

    try {
      const upstream = await fetch(target, {
        headers: {
          "User-Agent": UA,
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
        cf: { cacheTtl: 60, cacheEverything: true },
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (e) {
      return jsonResponse({ error: "Upstream fetch failed" }, 502);
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" },
  });
}
