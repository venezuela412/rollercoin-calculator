/* RollerCoin Calculator — Smart Edition
 * Data access layer: profile, power, prices (with CORS fallback chain)
 */

/* Extract a RollerCoin username from a profile URL or raw input */
function parseProfileInput(input) {
  if (!input) return null;
  let s = input.trim();
  const m = s.match(/rollercoin\.com\/p\/([A-Za-z0-9_-]+)/i);
  if (m) return m[1];
  s = s.replace(/^@/, "").replace(/\/+$/, "");
  if (/^[A-Za-z0-9_-]{2,30}$/.test(s)) return s;
  return null;
}

/* Fetch JSON trying direct, then the configured worker, then public proxies */
async function fetchJsonWithFallback(url, timeoutMs = 12000) {
  const attempts = [];
  attempts.push(() => fetch(url, { mode: "cors" }));
  if (CONFIG.workerProxy) {
    attempts.push(() =>
      fetch(`${CONFIG.workerProxy.replace(/\/+$/, "")}/?url=${encodeURIComponent(url)}`)
    );
  }
  for (const p of CONFIG.publicProxies) {
    attempts.push(() => fetch(p(url)));
  }
  let lastErr = null;
  for (const make of attempts) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await make();
      clearTimeout(t);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      return json;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("All fetch attempts failed");
}

/* Public profile: name, league, avatar id, registration */
async function getPublicProfile(username) {
  const json = await fetchJsonWithFallback(CONFIG.rollercoin.publicProfile(username));
  if (!json || !json.success) throw new Error("Profile not found");
  return json.data;
}

/* Power breakdown (raw units are MH/s) */
async function getUserPower(avatarId) {
  const json = await fetchJsonWithFallback(CONFIG.rollercoin.powerData(avatarId));
  if (!json || !json.success) throw new Error("Power data not available");
  return json.data;
}

/* Live USD prices from CoinGecko, fallback to bundled data/prices.json */
async function getPrices(coinGeckoIds) {
  try {
    const res = await fetch(CONFIG.coinGecko(coinGeckoIds));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    const out = {};
    for (const id of coinGeckoIds) {
      if (json[id] && typeof json[id].usd === "number") out[id] = json[id].usd;
    }
    if (Object.keys(out).length === 0) throw new Error("Empty prices");
    return { prices: out, live: true, date: null };
  } catch (e) {
    try {
      const res = await fetch("data/prices.json");
      const json = await res.json();
      return { prices: json.usd || {}, live: false, date: json.updatedAt || null };
    } catch (e2) {
      return { prices: {}, live: false, date: null };
    }
  }
}

/* Bundled mining parameters */
async function getMiningData() {
  const res = await fetch("data/mining.json");
  if (!res.ok) throw new Error("mining.json missing");
  return res.json();
}
