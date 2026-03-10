# 📈 Aktiencheck

Analysiere beliebige Aktien mit 15 wichtigen Finanzkennzahlen auf einen Blick – mit visueller Ampelbewertung und Gesamtscore.

![Aktiencheck Screenshot](https://placeholder.com/screenshot)

## Features

- 🔍 **Aktiensuche** – Gib Name oder Ticker-Symbol ein (z.B. „Apple", „AAPL", „Tesla", „SAP")
- 📊 **15 Kennzahlen** in 5 Kategorien:
  - Bewertung: KGV, KUV, KBV
  - Rentabilität: ROE, ROA, Bruttomarge, Operative Marge, Nettomarge
  - Liquidität & Verschuldung: Free Cashflow, Verschuldungsgrad, Current Ratio
  - Technische Analyse: RSI
  - Dividende & Wachstum: Dividendenrendite, Umsatz- und Gewinnwachstum
- 🟢🟡🔴 **Ampel-Bewertung** mit grün/orange/rot Indikatoren
- 🏆 **Gesamtscore** als prozentualer Ring-Chart
- 🌙☀️ **Dark / Light Mode**
- ✨ **Liquid Glass Design** im Trade Republic Stil

## Setup

### 1. Repository klonen

```bash
git clone https://github.com/DEIN_USER/aktiencheck.git
cd aktiencheck
npm install
```

### 2. API-Key holen

Kostenloser API-Key bei [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs/) registrieren.

### 3. Umgebungsvariable setzen

```bash
cp .env.local.example .env.local
# .env.local öffnen und FMP_API_KEY eintragen
```

### 4. Lokal starten

```bash
npm run dev
# → http://localhost:3000
```

## Deploy auf Vercel

1. Projekt auf GitHub pushen
2. Auf [vercel.com](https://vercel.com) importieren
3. Unter **Settings → Environment Variables** eintragen:
   - `FMP_API_KEY` = dein API-Key
4. Deploy!

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Financial Modeling Prep API**

## Hinweis

Dies ist kein Finanzberatungsprodukt. Alle Angaben dienen nur zu Informationszwecken. KI-Systeme können Fehler machen.
