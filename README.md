# Akash Technical Scanner

Fresh rebuild for a NIFTY 500, 5-minute breakout scanner.

## Current build
- NIFTY 500 constituent discovery
- Upstox NSE instrument master mapping
- 5-minute historical candles
- Daily levels: PDH/PDL, previous week/month, 52-week, ATH/ATL
- Pine-style breakout checks
- Next.js dashboard with manual RUN SCAN

## Local setup
```bash
npm install
cp .env.example .env.local
# add UPSTOX_ACCESS_TOKEN
npm run dev
```

The scanner intentionally starts with a manual scan and a small request limit for validation before adding automatic scanning.
