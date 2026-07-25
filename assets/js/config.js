/* RollerCoin Calculator — Smart Edition
 * Configuration: endpoints, proxies, socials, referral, donation
 */
const CONFIG = {
  rollercoin: {
    base: "https://rollercoin.com",
    publicProfile: (name) => `https://rollercoin.com/api/profile/public-user-profile-data/${encodeURIComponent(name)}`,
    powerData: (avatarId) => `https://rollercoin.com/api/profile/user-power-data/${encodeURIComponent(avatarId)}`,
  },
  /*
   * RollerCoin's API sends duplicate Access-Control-Allow-Origin headers,
   * which browsers reject. The public proxies below handle this — deploying
   * the included Cloudflare Worker (cloudflare-worker/worker.js) is OPTIONAL
   * and only makes loads faster/more reliable. Paste its URL here if used.
   */
  workerProxy: "",
  /* Free public CORS proxies used as fallback (best effort, may be slow).
     corsproxy.io verified working with browser Origin headers (2026-07). */
  publicProxies: [
    (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    (url) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ],
  coinGecko: (ids) =>
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
  referral: "https://rollercoin.com/?r=jrwrzg8f",
  donation: {
    label: "EVM (ETH / BSC / Polygon…)",
    address: "0x95316eE1b9cefB0730683b1313d96D0eC542bB1c",
  },
  socials: {
    youtube: "https://www.youtube.com/@Deficarlos",
    whatsapp: "https://whatsapp.com/channel/0029Va7k6Ob6buMSjVnmd224",
    telegram: "https://t.me/CriptoAirdropsTalk",
  },
  repo: "https://github.com/venezuela412/rollercoin-calculator",
  referencePowerTH: 1000, // 1 PH/s reference for the "best coins" table
};
