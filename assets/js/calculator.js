/* RollerCoin Calculator — Smart Edition
 * Math engine: earnings per coin, best coin, season pass & ROI analysis
 *
 * Power units: the RollerCoin public API returns raw power in GH/s.
 * 1 Zh/s = 1e12 GH/s · 1 Eh/s = 1e9 GH/s · 1 Ph/s = 1e6 · 1 Th/s = 1e3
 * League power estimates in data/mining.json are in Zh/s.
 */

const POWER_UNITS = ["GH/s", "TH/s", "PH/s", "EH/s", "ZH/s"];
const GH_PER = { "GH/s": 1, "TH/s": 1e3, "PH/s": 1e6, "EH/s": 1e9, "ZH/s": 1e12 };

function ghTo(gh, unit) { return gh / GH_PER[unit]; }
function unitToGH(v, unit) { return v * GH_PER[unit]; }

/* Auto-scale a raw GH/s value into a human string */
function formatPower(gh) {
  if (!isFinite(gh) || gh <= 0) return "0 GH/s";
  if (gh >= 1e12) return trimNum(gh / 1e12, 3) + " ZH/s";
  if (gh >= 1e9) return trimNum(gh / 1e9, 3) + " EH/s";
  if (gh >= 1e6) return trimNum(gh / 1e6, 2) + " PH/s";
  if (gh >= 1e3) return trimNum(gh / 1e3, 2) + " TH/s";
  return trimNum(gh, 2) + " GH/s";
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
  const abs = Math.abs(n);
  if (abs !== 0 && abs < 0.01) return (n < 0 ? "-$" : "$") + abs.toPrecision(2);
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

/* USD price for a coin row given the prices map */
function coinUsdPrice(ticker, coin, prices, mining) {
  if (coin.coinGeckoId && prices[coin.coinGeckoId] != null) return prices[coin.coinGeckoId];
  if (ticker === "RLT") return mining.rltUsdPrice;
  if (ticker === "USDT") return 1.0;
  return null;
}

/*
 * Estimate earnings for every coin.
 * userPowerGH: total user power in GH/s (raw API unit)
 * Returns array sorted by USD/day desc.
 */
function estimateEarnings(userPowerGH, mining, prices, tierKey = "default") {
  const userZH = userPowerGH / 1e12;
  const mult = (mining.leagueTierMultiplier[tierKey] ?? mining.leagueTierMultiplier.default) || 1;
  const rows = [];
  for (const [ticker, coin] of Object.entries(mining.coins)) {
    const leagueZH = (mining.leaguePowerZH[ticker] || 1) * mult;
    const share = leagueZH > 0 ? userZH / leagueZH : 0;
    const perDay = coin.dailyReward * share;
    const perBlock = perDay / mining.blocksPerDay;
    const usdPrice = coinUsdPrice(ticker, coin, prices, mining);
    const usdDay = usdPrice != null ? perDay * usdPrice : null;
    rows.push({
      ticker, name: coin.name, color: coin.color || "#8984b1",
      perBlock, perDay, perWeek: perDay * 7, perMonth: perDay * 30,
      usdDay, usdWeek: usdDay != null ? usdDay * 7 : null,
      usdMonth: usdDay != null ? usdDay * 30 : null,
    });
  }
  rows.sort((a, b) => (b.usdDay ?? -1) - (a.usdDay ?? -1));
  return rows;
}

/* Classic manual calculation (kept from the original tool's spirit) */
function manualReward({ networkPowerGH, userPowerGH, blockReward, secondsPerBlock }, usdPrice) {
  const share = networkPowerGH > 0 ? userPowerGH / networkPowerGH : 0;
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

/*
 * Season Pass analysis.
 * dailyUsd: user's current estimated USD/day (best coin)
 * pass: mining.seasonPass, rltUsd: number
 * Returns comparison of standard vs complete pass.
 */
function analyzeSeasonPass(dailyUsd, pass, rltUsd) {
  const options = [
    { key: "standard", costRlt: pass.standardCostRlt },
    { key: "complete", costRlt: pass.completeCostRlt },
  ];
  return options.map((o) => {
    const costUsd = o.costRlt * rltUsd;
    const bonusMiningUsd = dailyUsd * (pass.bonusPowerPercent / 100) * pass.seasonDays;
    const bonusRltUsd = pass.dailyBonusRlt * rltUsd * pass.seasonDays;
    const totalGainUsd = bonusMiningUsd + bonusRltUsd;
    const netUsd = totalGainUsd - costUsd;
    const roiPct = costUsd > 0 ? (netUsd / costUsd) * 100 : 0;
    const dailyGainUsd = totalGainUsd / pass.seasonDays;
    const paybackDays = dailyGainUsd > 0 ? costUsd / dailyGainUsd : Infinity;
    return { ...o, costUsd, totalGainUsd, netUsd, roiPct, paybackDays, worthIt: netUsd > 0 };
  });
}

/*
 * Investment / ROI analysis: invest X USD -> RLT -> miners -> power -> earnings.
 * investUsd: number; mining: data object; prices map.
 * Returns { powerGH, rlt, rows (earnings, sorted), best, monthlyUsd, paybackMonths }
 */
function analyzeInvestment(investUsd, mining, prices, tierKey = "default") {
  const rlt = investUsd / mining.rltUsdPrice;
  const powerGH = rlt * mining.minerMarket.thPerRlt * 1e3; // TH/s -> GH/s
  const rows = estimateEarnings(powerGH, mining, prices, tierKey);
  const best = rows.find((r) => r.usdDay != null) || null;
  const monthlyUsd = best ? best.usdMonth : 0;
  const paybackMonths = monthlyUsd > 0 ? investUsd / monthlyUsd : Infinity;
  return { powerGH, rlt, rows, best, monthlyUsd, paybackMonths };
}
