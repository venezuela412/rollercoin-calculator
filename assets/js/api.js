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

/* Fetch JSON: dedicated worker first (most reliable), then direct, then public proxies */
async function fetchJsonWithFallback(url, timeoutMs = 15000) {
  const attempts = [];
  if (CONFIG.workerProxy) {
    attempts.push((signal) =>
      fetch(`${CONFIG.workerProxy.replace(/\/+$/, "")}/?url=${encodeURIComponent(url)}`, { signal })
    );
  }
  attempts.push((signal) => fetch(url, { mode: "cors", signal }));
  for (const p of CONFIG.publicProxies) {
    attempts.push((signal) => fetch(p(url), { signal }));
  }
  let lastErr = null;
  for (const make of attempts) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await make(ctrl.signal);
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
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

/* Power breakdown (raw units are GH/s) */
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
