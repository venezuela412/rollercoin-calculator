/* RollerCoin Calculator — Smart Edition
 * UI wiring: tabs, i18n, profile analysis, best coins, manual calc
 */

const state = {
  lang: localStorage.getItem("rc_lang") ||
        ((navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en"),
  mining: null,
  prices: {},
  pricesLive: false,
  pricesDate: null,
  userPowerMH: null,     // set after profile analysis
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
    const key = el.getAttribute("data-i18n");
    const v = I18N[state.lang][key];
    if (typeof v === "string") el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const v = I18N[state.lang][key];
    if (typeof v === "string") el.placeholder = v;
  });
  document.querySelectorAll("[data-i18n-value]").forEach((el) => {
    const key = el.getAttribute("data-i18n-value");
    const v = I18N[state.lang][key];
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
    state.userPowerMH = power.current_power || ((power.miners || 0) + (power.bonus || 0) + (power.games || 0) + (power.temp || 0));
    state.leagueTier = leagueTierKey(profile.league && profile.league.title && profile.league.title.en);
    renderProfile(profile, power);
    state.earnings = estimateEarnings(state.userPowerMH, state.mining, state.prices, state.leagueTier);
    renderEarnings(state.earnings);
    renderAdvice(state.earnings);
    renderBestCoins();
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
  document.getElementById("pwTotal").textContent = formatPower(state.userPowerMH);
  document.getElementById("pwMiners").textContent = formatPower(power.miners || 0);
  document.getElementById("pwBonus").textContent = formatPower(power.bonus || 0);
  document.getElementById("pwGames").textContent = formatPower(power.games || 0);
  document.getElementById("pwTemp").textContent = formatPower(power.temp || 0);
}

function renderEarnings(rows) {
  const tbody = document.getElementById("earningsBody");
  tbody.innerHTML = "";
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    if (i === 0) tr.className = "best-row";
    tr.innerHTML = `
      <td><span class="coin-cell"><span class="coin-badge" style="background:${r.color}">${r.ticker.slice(0, 3)}</span>
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

/* ---------- best coins tab ---------- */
function renderBestCoins() {
  const usingOwn = state.userPowerMH != null;
  const powerMH = usingOwn ? state.userPowerMH : CONFIG.referencePowerTH * 1e6;
  const rows = usingOwn && state.earnings
    ? state.earnings
    : estimateEarnings(powerMH, state.mining, state.prices, "default");
  document.getElementById("bestRef").textContent = usingOwn
    ? "⭐ " + t("best_your_power") + ` (${formatPower(powerMH)})`
    : t("best_reference", formatPower(powerMH));
  const tbody = document.getElementById("bestBody");
  tbody.innerHTML = "";
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    if (i === 0) tr.className = "best-row";
    tr.innerHTML = `
      <td><span class="coin-cell"><span class="coin-badge" style="background:${r.color}">${r.ticker.slice(0, 3)}</span>
        <span>${r.name} (${r.ticker})${i === 0 ? ` <span class="best-badge">${t("best_badge")}</span>` : ""}</span></span></td>
      <td>${r.usdDay != null ? formatUsd(r.usdDay) : "—"}</td>
      <td>${r.usdMonth != null ? formatUsd(r.usdMonth) : "—"}</td>`;
    tbody.appendChild(tr);
  });
}

/* ---------- manual calculator ---------- */
const UNITS = ["GH/s", "TH/s", "PH/s", "EH/s"];

function initManual() {
  const netSel = document.getElementById("mNetworkUnit");
  const userSel = document.getElementById("mUserUnit");
  UNITS.forEach((u) => {
    netSel.add(new Option(u, u));
    userSel.add(new Option(u, u));
  });
  netSel.value = "EH/s";
  userSel.value = "TH/s";
  const coinSel = document.getElementById("mCoin");
  Object.entries(state.mining.coins).forEach(([ticker, c]) => coinSel.add(new Option(ticker, ticker)));
  coinSel.addEventListener("change", prefillManual);
  prefillManual();
}

function prefillManual() {
  const ticker = document.getElementById("mCoin").value;
  const coin = state.mining.coins[ticker];
  document.getElementById("mReward").value = (coin.dailyReward / state.mining.blocksPerDay).toPrecision(4);
  document.getElementById("mTime").value = state.mining.secondsPerBlock;
  document.getElementById("mNetwork").value = state.mining.leaguePowerEH[ticker] || "";
  document.getElementById("mNetworkUnit").value = "EH/s";
}

function runManual() {
  const ticker = document.getElementById("mCoin").value;
  const coin = state.mining.coins[ticker];
  const networkMH = (parseFloat(document.getElementById("mNetwork").value) || 0) *
    MH_PER[document.getElementById("mNetworkUnit").value];
  const userMH = (parseFloat(document.getElementById("mUser").value) || 0) *
    MH_PER[document.getElementById("mUserUnit").value];
  let seconds = parseFloat(document.getElementById("mTime").value) || 600;
  if (document.getElementById("mTimeUnit").value === "MINUTES") seconds *= 60;
  const reward = parseFloat(document.getElementById("mReward").value) || 0;
  const price = coin.coinGeckoId ? state.prices[coin.coinGeckoId]
    : ticker === "RLT" ? state.mining.rltUsdPrice : null;
  const r = manualReward({ networkPowerMH: networkMH, userPowerMH: userMH, blockReward: reward, secondsPerBlock: seconds }, price);
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
  if (state.mining) renderBestCoins();
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

  document.getElementById("langToggle").addEventListener("click", toggleLang);
  document.getElementById("analyzeBtn").addEventListener("click", analyzeProfile);
  document.getElementById("profileInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") analyzeProfile();
  });
  document.getElementById("manualBtn").addEventListener("click", runManual);
  document.querySelectorAll("nav a[data-tab]").forEach((a) =>
    a.addEventListener("click", (e) => { e.preventDefault(); showTab(a.getAttribute("data-tab")); }));

  /* Deep link: ?p=username auto-analyzes */
  const q = new URLSearchParams(location.search).get("p");
  if (q) {
    document.getElementById("profileInput").value = q;
    analyzeProfile();
  }
})();
