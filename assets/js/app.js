/* RollerCoin Calculator — Smart Edition
 * UI wiring: tabs, i18n, profile analysis, best coins, season pass, ROI, manual calc
 */

const state = {
  lang: localStorage.getItem("rc_lang") ||
        ((navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en"),
  mining: null,
  prices: {},
  pricesLive: false,
  pricesDate: null,
  userPowerGH: null,     // set after profile analysis (raw API unit: GH/s)
  leagueTier: "default",
  earnings: null,
};

function t(key, ...args) {
  const v = I18N[state.lang][key];
  return typeof v === "function" ? v(...args) : v;
}

/* ---------- i18n ---------- */
function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = I18N[state.lang][el.getAttribute("data-i18n")];
    if (typeof v === "string") el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const v = I18N[state.lang][el.getAttribute("data-i18n-placeholder")];
    if (typeof v === "string") el.placeholder = v;
  });
  document.querySelectorAll("[data-i18n-value]").forEach((el) => {
    const v = I18N[state.lang][el.getAttribute("data-i18n-value")];
    if (typeof v === "string") el.value = v;
  });
  document.getElementById("langToggle").textContent = t("language");
  document.title = `${t("title")} · ${t("subtitle")}`;
  updateDataBadges();
}

function toggleLang() {
  state.lang = state.lang === "en" ? "es" : "en";
  localStorage.setItem("rc_lang", state.lang);
  applyLang();
  renderDynamic();
}

/* ---------- tabs ---------- */
function showTab(id) {
  document.querySelectorAll("main > section").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  document.querySelectorAll("nav a").forEach((a) =>
    a.classList.toggle("active", a.getAttribute("data-tab") === id));
}

/* ---------- badges ---------- */
function updateDataBadges() {
  const priceEl = document.getElementById("priceBadge");
  if (priceEl) {
    priceEl.textContent = state.pricesLive ? "🟢 " + t("prices_live")
      : state.pricesDate ? "🟡 " + t("prices_cached", state.pricesDate.slice(0, 10))
      : "";
  }
  const miningEl = document.getElementById("miningBadge");
  if (miningEl && state.mining) miningEl.textContent = "📊 " + t("data_updated", state.mining.updatedAt);
}

/* ---------- profile analysis ---------- */
async function analyzeProfile() {
  const input = document.getElementById("profileInput").value;
  const username = parseProfileInput(input);
  const statusEl = document.getElementById("profileStatus");
  const resultsEl = document.getElementById("profileResults");
  if (!username) {
    statusEl.textContent = t("profile_error");
    statusEl.className = "status error";
    return;
  }
  statusEl.textContent = t("profile_loading");
  statusEl.className = "status loading";
  resultsEl.classList.add("hidden");
  try {
    const profile = await getPublicProfile(username);
    const power = await getUserPower(profile.avatar_id);
    state.userPowerGH = power.current_power || ((power.miners || 0) + (power.bonus || 0) + (power.games || 0) + (power.temp || 0));
    state.leagueTier = leagueTierKey(profile.league && profile.league.title && profile.league.title.en);
    renderProfile(profile, power);
    state.earnings = estimateEarnings(state.userPowerGH, state.mining, state.prices, state.leagueTier);
    renderEarnings(state.earnings);
    renderAdvice(state.earnings);
    renderBestCoins();
    renderSeasonPass();
    resultsEl.classList.remove("hidden");
    statusEl.textContent = "";
    statusEl.className = "status";
  } catch (e) {
    console.error(e);
    statusEl.textContent = t("profile_error");
    statusEl.className = "status error";
  }
}

function renderProfile(profile, power) {
  document.getElementById("pName").textContent = profile.name;
  const leagueName = profile.league && profile.league.title && profile.league.title.en;
  document.getElementById("pLeague").textContent = leagueName || "—";
  const lgImg = document.getElementById("pLeagueImg");
  if (profile.league && profile.league.main_img_url) { lgImg.src = profile.league.main_img_url; lgImg.classList.remove("hidden"); }
  else lgImg.classList.add("hidden");
  document.getElementById("pSince").textContent = profile.registration ? profile.registration.slice(0, 10) : "—";
  document.getElementById("pwTotal").textContent = formatPower(state.userPowerGH);
  document.getElementById("pwMiners").textContent = formatPower(power.miners || 0);
  document.getElementById("pwBonus").textContent = formatPower(power.bonus || 0);
  document.getElementById("pwGames").textContent = formatPower(power.games || 0);
  document.getElementById("pwTemp").textContent = formatPower(power.temp || 0);
}

function coinBadge(r) {
  return `<span class="coin-badge" style="background:${r.color}">${r.ticker.slice(0, 3)}</span>`;
}

function renderEarnings(rows) {
  const tbody = document.getElementById("earningsBody");
  tbody.innerHTML = "";
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    if (i === 0) tr.className = "best-row";
    tr.innerHTML = `
      <td><span class="coin-cell">${coinBadge(r)}
        <span>${r.ticker}${i === 0 ? ` <span class="best-badge">${t("best_badge")}</span>` : ""}</span></span></td>
      <td>${formatCoin(r.perBlock)}</td>
      <td>${formatCoin(r.perDay)}</td>
      <td>${r.usdDay != null ? formatUsd(r.usdDay) : "—"}</td>
      <td>${r.usdMonth != null ? formatUsd(r.usdMonth) : "—"}</td>`;
    tbody.appendChild(tr);
  });
}

function renderAdvice(rows) {
  const box = document.getElementById("adviceBox");
  const priced = rows.filter((r) => r.usdDay != null);
  if (!priced.length) { box.innerHTML = ""; return; }
  const [first, second] = priced;
  let html = `<p>🏆 ${t("advice_best_single", first.ticker, formatUsd(first.usdDay))}</p>`;
  if (second) html += `<p>⚖️ ${t("advice_split", first.ticker, second.ticker)}</p>`;
  html += `<p>💡 ${t("advice_rlt")}</p>`;
  box.innerHTML = html;
}

/* ---------- helpers ---------- */
function activePowerGH() {
  return state.userPowerGH != null ? state.userPowerGH : CONFIG.referencePowerEH * 1e9;
}
function bestDailyUsd() {
  const rows = state.userPowerGH != null && state.earnings
    ? state.earnings
    : estimateEarnings(CONFIG.referencePowerEH * 1e9, state.mining, state.prices, "default");
  const best = rows.find((r) => r.usdDay != null);
  return best ? best.usdDay : 0;
}

/* ---------- best coins tab ---------- */
function renderBestCoins() {
  const usingOwn = state.userPowerGH != null;
  const powerGH = activePowerGH();
  const rows = usingOwn && state.earnings
    ? state.earnings
    : estimateEarnings(powerGH, state.mining, state.prices, "default");
  document.getElementById("bestRef").textContent = usingOwn
    ? "⭐ " + t("best_your_power") + ` (${formatPower(powerGH)})`
    : t("best_reference", formatPower(powerGH));
  const tbody = document.getElementById("bestBody");
  tbody.innerHTML = "";
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    if (i === 0) tr.className = "best-row";
    tr.innerHTML = `
      <td><span class="coin-cell">${coinBadge(r)}
        <span>${r.name} (${r.ticker})${i === 0 ? ` <span class="best-badge">${t("best_badge")}</span>` : ""}</span></span></td>
      <td>${r.usdDay != null ? formatUsd(r.usdDay) : "—"}</td>
      <td>${r.usdMonth != null ? formatUsd(r.usdMonth) : "—"}</td>`;
    tbody.appendChild(tr);
  });
}

/* ---------- season pass tab ---------- */
function renderSeasonPass() {
  const pass = state.mining.seasonPass;
  if (!pass) return;
  const usingOwn = state.userPowerGH != null;
  document.getElementById("seasonUsing").textContent = t("season_using",
    usingOwn ? t("season_your_profile") : t("season_reference", formatPower(CONFIG.referencePowerEH * 1e9)));
  const results = analyzeSeasonPass(bestDailyUsd(), pass, state.mining.rltUsdPrice);
  const tbody = document.getElementById("seasonBody");
  tbody.innerHTML = "";
  results.forEach((r) => {
    const tr = document.createElement("tr");
    if (r.worthIt) tr.className = "best-row";
    tr.innerHTML = `
      <td>${t(r.key === "standard" ? "season_standard" : "season_complete")}
        ${r.worthIt ? ` <span class="best-badge">${t("season_worth")}</span>` : ` <span class="muted">${t("season_not_worth")}</span>`}</td>
      <td>${formatUsd(r.costUsd)}</td>
      <td>${formatUsd(r.totalGainUsd)}</td>
      <td>${r.netUsd >= 0 ? "+" : ""}${formatUsd(r.netUsd)}</td>
      <td>${r.roiPct.toFixed(0)}%</td>
      <td>${isFinite(r.paybackDays) ? t("season_days", Math.ceil(r.paybackDays)) : "—"}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById("seasonNote").textContent = "ℹ️ " + t("season_note");
}

/* ---------- ROI / invest tab ---------- */
function runRoi() {
  const usd = parseFloat(document.getElementById("roiAmount").value) || 0;
  const out = document.getElementById("roiResults");
  if (usd <= 0) { out.classList.add("hidden"); return; }
  const r = analyzeInvestment(usd, state.mining, state.prices, state.leagueTier);
  document.getElementById("roiSummary").textContent =
    "💰 " + t("roi_summary", usd.toLocaleString("en-US"), formatCoin(r.rlt), formatPower(r.powerGH));
  document.getElementById("roiBest").textContent = r.best
    ? "🏆 " + t("roi_best", r.best.ticker, formatUsd(r.best.usdMonth)) : "";
  document.getElementById("roiPayback").textContent = isFinite(r.paybackMonths) && r.paybackMonths <= 600
    ? "⏳ " + t("roi_payback", r.paybackMonths.toFixed(1)) : "⏳ " + t("roi_payback_never");
  const tbody = document.getElementById("roiBody");
  tbody.innerHTML = "";
  r.rows.forEach((row, i) => {
    const tr = document.createElement("tr");
    if (i === 0) tr.className = "best-row";
    tr.innerHTML = `
      <td><span class="coin-cell">${coinBadge(row)}
        <span>${row.ticker}${i === 0 ? ` <span class="best-badge">${t("best_badge")}</span>` : ""}</span></span></td>
      <td>${row.usdDay != null ? formatUsd(row.usdDay) : "—"}</td>
      <td>${row.usdWeek != null ? formatUsd(row.usdWeek) : "—"}</td>
      <td>${row.usdMonth != null ? formatUsd(row.usdMonth) : "—"}</td>`;
    tbody.appendChild(tr);
  });
  out.classList.remove("hidden");
}

/* ---------- manual calculator ---------- */
function initManual() {
  const netSel = document.getElementById("mNetworkUnit");
  const userSel = document.getElementById("mUserUnit");
  POWER_UNITS.forEach((u) => {
    netSel.add(new Option(u, u));
    userSel.add(new Option(u, u));
  });
  netSel.value = "ZH/s";
  userSel.value = "EH/s";
  const coinSel = document.getElementById("mCoin");
  Object.entries(state.mining.coins).forEach(([ticker]) => coinSel.add(new Option(ticker, ticker)));
  coinSel.addEventListener("change", prefillManual);
  prefillManual();
}

function prefillManual() {
  const ticker = document.getElementById("mCoin").value;
  const coin = state.mining.coins[ticker];
  document.getElementById("mReward").value = (coin.dailyReward / state.mining.blocksPerDay).toPrecision(4);
  document.getElementById("mTime").value = state.mining.secondsPerBlock;
  document.getElementById("mNetwork").value = state.mining.leaguePowerZH[ticker] || "";
  document.getElementById("mNetworkUnit").value = "ZH/s";
}

function runManual() {
  const ticker = document.getElementById("mCoin").value;
  const coin = state.mining.coins[ticker];
  const networkGH = unitToGH(parseFloat(document.getElementById("mNetwork").value) || 0,
    document.getElementById("mNetworkUnit").value);
  const userGH = unitToGH(parseFloat(document.getElementById("mUser").value) || 0,
    document.getElementById("mUserUnit").value);
  let seconds = parseFloat(document.getElementById("mTime").value) || 600;
  if (document.getElementById("mTimeUnit").value === "MINUTES") seconds *= 60;
  const reward = parseFloat(document.getElementById("mReward").value) || 0;
  const price = coinUsdPrice(ticker, coin, state.prices, state.mining);
  const r = manualReward({ networkPowerGH: networkGH, userPowerGH: userGH, blockReward: reward, secondsPerBlock: seconds }, price);
  const rows = [
    [t("manual_expected"), r.perBlock, r.usdPerBlock],
    [t("manual_daily"), r.daily, r.usdDaily],
    [t("manual_weekly"), r.weekly, r.usdWeekly],
    [t("manual_monthly"), r.monthly, r.usdMonthly],
  ];
  document.getElementById("manualBody").innerHTML = rows.map(([label, coinAmt, usd]) =>
    `<tr><td>${label}</td><td>${formatCoin(coinAmt)} ${ticker}</td><td>${usd != null ? formatUsd(usd) : "—"}</td></tr>`
  ).join("");
}

/* ---------- dynamic re-render (language switch) ---------- */
function renderDynamic() {
  if (state.earnings) {
    renderEarnings(state.earnings);
    renderAdvice(state.earnings);
  }
  if (state.mining) {
    renderBestCoins();
    renderSeasonPass();
    if (!document.getElementById("roiResults").classList.contains("hidden")) runRoi();
    runManual();
  }
}

/* ---------- misc UI ---------- */
function initCopy() {
  document.getElementById("donateCopy").addEventListener("click", async () => {
    const btn = document.getElementById("donateCopy");
    try {
      await navigator.clipboard.writeText(CONFIG.donation.address);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = CONFIG.donation.address;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    btn.textContent = t("copied");
    setTimeout(() => (btn.textContent = t("copy")), 1500);
  });
  document.getElementById("donateAddr").textContent = CONFIG.donation.address;
  document.getElementById("joinBtn").href = CONFIG.referral;
  document.getElementById("ytLink").href = CONFIG.socials.youtube;
  document.getElementById("waLink").href = CONFIG.socials.whatsapp;
  document.getElementById("tgLink").href = CONFIG.socials.telegram;
  document.getElementById("repoLink").href = CONFIG.repo;
}

/* ---------- boot ---------- */
(async function boot() {
  state.mining = await getMiningData();
  const ids = Object.values(state.mining.coins).map((c) => c.coinGeckoId).filter(Boolean);
  const p = await getPrices(ids);
  state.prices = p.prices;
  state.pricesLive = p.live;
  state.pricesDate = p.date;

  applyLang();
  initCopy();
  initManual();
  renderBestCoins();
  renderSeasonPass();

  document.getElementById("langToggle").addEventListener("click", toggleLang);
  document.getElementById("analyzeBtn").addEventListener("click", analyzeProfile);
  document.getElementById("profileInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") analyzeProfile();
  });
  document.getElementById("manualBtn").addEventListener("click", runManual);
  document.getElementById("roiBtn").addEventListener("click", runRoi);
  document.getElementById("roiAmount").addEventListener("keydown", (e) => {
    if (e.key === "Enter") runRoi();
  });
  document.querySelectorAll("nav a[data-tab]").forEach((a) =>
    a.addEventListener("click", (e) => { e.preventDefault(); showTab(a.getAttribute("data-tab")); }));

  /* Deep link: ?p=username auto-analyzes */
  const q = new URLSearchParams(location.search).get("p");
  if (q) {
    document.getElementById("profileInput").value = q;
    analyzeProfile();
  }
})();
