# The Warehouse — Inventory Card Tracker

A lightweight, offline-friendly card inventory + P&L tracker for traders running show tables, eBay flips, and partner-shared inventories. Built as a single-page web app (HTML + React via CDN, no build step).

## Features

- **Multiple inventories** — separate sets of cards, events, expenses & sheets per business line / partner / project. Switch via the sidebar pill.
- **Cards** — add, mark sold / traded / given / keeping; auto profit + margin.
- **Lot splitter** — buy a binder or box, split into N rows at per-hit basis.
- **Events** — per-show P&L including table fee, giveaways, food/travel.
- **Expenses** — categorized (Travel, Lodging, Food, Supplies, Shipping…) with per-event tagging.
- **Show mode** — start a session, every add/sell auto-tags the event and a live tally banner shows at the top.
- **Month-end snapshots** — freeze inventory for taxes; export to CSV.
- **Print report** — formatted PDF-ready inventory + P&L sheet.
- **Google Sheets sync** — push/pull live data to a shared sheet (one per inventory). Settings has the full one-time setup walkthrough.
- **Tweaks panel** — toggle in the toolbar to adjust density, accent color, sidebar style live.
- **Mobile-first responsive** — bottom tabs, FAB, sheet-style modals on phone.

## Running locally

This is a static site — just serve the files. Any of these works:

```bash
# Python
python3 -m http.server 8000

# Node (npx)
npx serve .

# PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`.

> Opening `index.html` directly with `file://` will work for most things, but Google Sheets OAuth requires a real HTTP origin.

## Deploying

The whole thing is static, so any host works. Easiest options:

- **GitHub Pages** — Settings → Pages → Deploy from branch (main) → save. Your URL will be `https://<username>.github.io/<repo>/`.
- **Vercel / Netlify** — drag-drop the folder, or connect this repo. Free tier covers personal use.
- **Cloudflare Pages** — same flow, generous free tier.

After deploying, copy the live URL — you'll paste it into Google Cloud Console (Authorized JavaScript origins) when setting up Sheets sync.

## File layout

```
index.html              # entry point
styles.css              # design system + components
assets/
  brand-mark.png        # app icon
src/
  store.js              # data store (workspaces, cards, events, expenses, snapshots)
  sheets.js             # Google Sheets v4 API + GIS OAuth
  ui.jsx                # shared primitives (Stat, Modal, Field, MoneyInput…)
  forms.jsx             # AddCardModal, SellModal, EventModal, LotSplitter…
  screens.jsx           # Dashboard, Inventory, Detail, Events, Expenses, Reports, Settings, Help
  app.jsx               # shell, navigation, workspace switcher
  tweaks-panel.jsx      # live tweak panel
```

## Data model

All state is in `localStorage` under key `pct.v4`. Shape:

```js
{
  schemaVersion: 4,
  activeWorkspaceId: "w1",
  workspaces: [
    { id, name, cards, events, expenses, snapshots, session, gsheetUrl, lastSyncedAt, lastSyncDirection }
  ],
  settings: { googleClientId, demoCleared, demoDismissed }
}
```

Migrations from `pct.v2` / `pct.v3` (single-state shape) auto-run on load and wrap legacy data into a single workspace.

## Google Sheets setup

Open the app → **Settings → Google Sheets sync → "How do I get the Client ID?"** for the 6-step walkthrough. Or skim the **Google Sheets sync** topic in the Help guide (the `?` button anywhere in the app).

TL;DR:
1. Create a blank Google Sheet
2. Get a Client ID via Google Cloud Console (~5 min, one-time)
3. Paste both into Settings → Connect → Initialize sheet → Push

## License

Private project — adapt freely.
