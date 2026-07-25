/* RollerCoin Calculator — Smart Edition
 * Math engine: earnings per coin, best coin, split advice
 *
 * Power units: the RollerCoin public API returns raw power in MH/s.
 * 1 EH/s = 1e12 MH/s. League power estimates in data/mining.json are EH/s.
 */

const MH_PER = { "GH/s": 1e3, "TH/s": 1e6, "PH/s": 1e9, "EH/s": 1e12 };

function mhTo(mh, unit) { return mh / MH_PER[unit]; }

/* Auto-scale a raw MH/s value into a human string */
function formatPower(mh) {
  if (!isFinite(mh) || mh <= 0) return "0 GH/s";
  if (mh >= 1e12) return trimNum(mh / 1e12, 2) + " EH/s";
  if (mh >= 1e9) return trimNum(mh / 1e9, 2) + " PH/s";
  if (mh >= 1e6) return trimNum(mh / 1e6, 2) + " TH/s";
  return trimNum(mh / 1e3, 2) + " GH/s";
}

function trimNum(n, maxDecimals) {
  return n.toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
}

/* Format a coin amount with sensible precision */
function formatCoin(n) {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  let d = 2;
  if (abs < 1e-6) d = 10;
  else if (abs < 1e-4) d = 8;
  else if (abs < 0.01) d = 6;
  else if (abs < 1) d = 4;
  else if (abs < 1000) d = 3;
  return n.toLocaleString("en-US", { maximumFractionDigits: d });
}

const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function formatUsd(n) {
  if (Math.abs(n) < 0.01 && n !== 0) return "$" + n.toFixed(4);
  return usdFmt.format(n);
}

/* Map a league title like "Platinum III" to a tier key */
function leagueTierKey(leagueTitle) {
  if (!leagueTitle) return "default";
  const first = String(leagueTitle).toLowerCase().split(/\s+/)[0];
  const known = ["bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster", "elite", "champion"];
  if (first === "champion") return "elite";
  return known.includes(first) ? first : "default";
}

/*
 * Estimate earnings for every coin.
 * userPowerMH: total user power in MH/s
 * mining: data/mining.json object
 * prices: { coinGeckoId: usdPrice }
 * tierKey: league tier (scales league power)
 * Returns array sorted by USD/day desc.
 */
function estimateEarnings(userPowerMH, mining, prices, tierKey = "default") {
  const userEH = userPowerMH / 1e12;
  const mult = (mining.leagueTierMultiplier[tierKey] ?? mining.leagueTierMultiplier.default) || 1;
  const rows = [];
  for (const [ticker, coin] of Object.entries(mining.coins)) {
    const leagueEH = (mining.leaguePowerEH[ticker] || 1) * mult;
    const share = leagueEH > 0 ? userEH / leagueEH : 0;
    const perDay = coin.dailyReward * share;
    const perBlock = perDay / mining.blocksPerDay;
    let usdPrice = null;
    if (coin.coinGeckoId && prices[coin.coinGeckoId] != null) usdPrice = prices[coin.coinGeckoId];
    else if (ticker === "RLT") usdPrice = mining.rltUsdPrice;
    const usdDay = usdPrice != null ? perDay * usdPrice : null;
    rows.push({
      ticker, name: coin.name, color: coin.color || "#8984b1",
      perBlock, perDay, perWeek: perDay * 7, perMonth: perDay * 30,
      usdDay, usdMonth: usdDay != null ? usdDay * 30 : null,
    });
  }
  rows.sort((a, b) => (b.usdDay ?? -1) - (a.usdDay ?? -1));
  return rows;
}

/* Classic manual calculation (kept from the original tool's spirit) */
function manualReward({ networkPowerMH, userPowerMH, blockReward, secondsPerBlock }, usdPrice) {
  const share = networkPowerMH > 0 ? userPowerMH / networkPowerMH : 0;
  const perBlock = blockReward * share;
  const blocksDay = 86400 / secondsPerBlock;
  const daily = perBlock * blocksDay;
  return {
    perBlock,
    daily,
    weekly: daily * 7,
    monthly: daily * 30,
    usdPerBlock: usdPrice != null ? perBlock * usdPrice : null,
    usdDaily: usdPrice != null ? daily * usdPrice : null,
    usdWeekly: usdPrice != null ? daily * 7 * usdPrice : null,
    usdMonthly: usdPrice != null ? daily * 30 * usdPrice : null,
  };
}
