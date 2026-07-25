# 🐹 RollerCoin Calculator — Smart Edition

> **Paste your RollerCoin profile. Get your earnings. No typing, no mistakes.**
> Pega tu perfil de RollerCoin. Obtén tus ganancias. Sin escribir, sin errores.

[![GitHub Pages](https://img.shields.io/badge/demo-live-03e1e4?style=for-the-badge&logo=github)](https://venezuela412.github.io/rollercoin-calculator/)
[![License: MIT](https://img.shields.io/badge/license-MIT-ffdc00?style=for-the-badge)](LICENSE)
[![Prices](https://img.shields.io/badge/prices-auto--updated-brightgreen?style=for-the-badge)](https://github.com/venezuela412/rollercoin-calculator/actions)
[![Languages](https://img.shields.io/badge/lang-EN%20%7C%20ES-blueviolet?style=for-the-badge)](https://venezuela412.github.io/rollercoin-calculator/)

## ▶️ Live demo / Demo en vivo

### 👉 **[venezuela412.github.io/rollercoin-calculator](https://venezuela412.github.io/rollercoin-calculator/)** 👈

---

## ✨ What is this? / ¿Qué es esto?

**EN** — A free, open-source, smarter evolution of the classic RollerCoin calculator. Instead of filling in fields by hand (and making mistakes), you just **paste your RollerCoin profile link** (e.g. `https://rollercoin.com/p/cryptorell`) and the app fetches your real mining power automatically, then estimates:

**ES** — Una evolución gratuita, open-source y más inteligente de la clásica calculadora de RollerCoin. En lugar de rellenar campos a mano (y cometer errores), solo **pegas el enlace de tu perfil de RollerCoin** y la app obtiene tu poder de minería real automáticamente, luego estima:

- 📊 **Earnings per coin** — per block, per day, per month (in crypto **and** USD with live prices)
- 🏆 **Best coin to mine right now** — ranked by real USD value
- ⚖️ **Optimal split advice** — where to point your power for maximum profit
- 🕹️ **Classic manual calculator** — with smart auto-filled values
- 🌐 **English & Español** — one click language switch
- 🔄 **Always up to date** — prices refresh automatically every day via GitHub Actions

> ⚠️ **All values are approximate.** RollerCoin does not publish live per-league network power publicly, so earnings are estimates based on community data + live market prices. Real in-game results will vary.
>
> ⚠️ **Todos los valores son aproximados.** RollerCoin no publica el poder de red por liga en vivo, así que las ganancias son estimaciones basadas en datos de la comunidad + precios de mercado en vivo. Los resultados reales variarán.

## 🚀 How it works / Cómo funciona

```
Profile URL  ──▶  RollerCoin public API  ──▶  your real power & league
                      +
Live prices (CoinGecko) + community mining data
                      │
                      ▼
        Earnings per coin · best coin · split advice
```

- No accounts, no API keys, no manual fields.
- 100% static site — hosted free on **GitHub Pages**.
- Mining parameters live in [`data/mining.json`](data/mining.json) and can be improved by anyone via Pull Request.

## 🛠️ Run locally / Ejecutar en local

```bash
git clone https://github.com/venezuela412/rollercoin-calculator.git
cd rollercoin-calculator
python -m http.server 8000
# open http://localhost:8000
```

## 🤝 Contributing / Contribuir

Block rewards and league power change over time. If you have fresher in-game numbers, update [`data/mining.json`](data/mining.json) and open a PR — the whole community benefits. 💛

---

## 🎮 New to RollerCoin? / ¿Nuevo en RollerCoin?

[![Play RollerCoin](https://img.shields.io/badge/🎮_Play_RollerCoin-join_here-ffdc00?style=for-the-badge&labelColor=181928)](https://rollercoin.com/?r=jrwrzg8f)

Join with this link and start mining with a bonus — it also supports this project at no cost to you.
Únete con este enlace y empieza a minar con bonus — también apoyas este proyecto sin costo para ti.

## 💛 Donations / Donaciones

If this tool helps you, you can support it (any EVM network: ETH · BSC · Polygon…):

```
0x95316eE1b9cefB0730683b1313d96D0eC542bB1c
```

## 📣 Follow me / Sígueme

| Platform | Link |
|---|---|
| ▶️ **YouTube** | [@Deficarlos](https://www.youtube.com/@Deficarlos) |
| 💬 **WhatsApp Channel** | [Join the channel](https://whatsapp.com/channel/0029Va7k6Ob6buMSjVnmd224) |
| ✈️ **Telegram** | [CriptoAirdropsTalk](https://t.me/CriptoAirdropsTalk) |

---

## 🙏 Credits / Créditos

- Inspired by **[Lmendev/rollercoin-calculator](https://github.com/Lmendev/rollercoin-calculator)** — the original tool that started it all.
- Pixel font: PixelOperator (public domain).
- Not affiliated with RollerCoin. Community project.

## 📄 License

[MIT](LICENSE) — free to use, fork and improve.
