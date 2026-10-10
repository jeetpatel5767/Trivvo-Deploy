# Trivvo video kit

Everything needed to make the Trivvo product / ad video match the app exactly: the brief,
the storyboard, the brand rules, and assets taken from the live app
(https://trivvo-deploy.vercel.app) and this repo. Nothing in here is used by the app itself.

## Rules for the video

1. **No crypto, anywhere.** No USDC, crypto, wallet, blockchain, Avalanche, smart contract,
   escrow, tx hashes or `0x…` addresses, on screen or in the script.
2. **Money is in rupees.** Show `₹150`, never `150 USDC`. Plain words: "Paid instantly",
   "Money stays locked safely until the task is done", "Unused budget comes back to you".
3. **It ends on "Coming soon".** The app pays in USDC today, so the video presents ₹ payouts as
   what is coming, not what is live.
4. **It looks like the app.** Same colours, font, logo, shapes and motion (below). Real screens
   come from the live app via `tools/capture-screens.mjs`, which swaps the money and wording to
   rupees at capture time without touching the app's code.
5. **One message at a time.** No split screens with two messages; on a phone nobody reads both.

## Storyboard: "Your City Pays You" (~55 s)

Hunters get the light look (bone and pink), businesses get the dark look (ink), so the two
sides read as different at a glance.

| Time | Scene | On screen |
|---|---|---|
| 0:00–0:05 | **Cold open: the money first** | Full pink. `₹0` counts up to `₹150` with the reward chime, rings and burst. "₹150. Earned in 20 minutes." Pause. "For having a coffee." |
| 0:05–0:08 | **Problem: shops** | An ad feed scrolls past fast. "Shops spend lakhs on ads…" then "…people scroll right past." |
| 0:08–0:11 | **Problem: people** | A city map, dozens of grey shop pins, a dotted walking path passing all of them. "You walk past 100 places a day. You step into none." |
| 0:11–0:13 | **Problem: joined** | "Shops want visitors. People want a reason to go." |
| 0:13–0:17 | **The turn** | Grey pins flip to pink in a wave. The logo's chevrons draw in. "Trivvo turns your city into a treasure hunt." |
| 0:17–0:23 | **01 Show up** | Phone: hunts list, then a pin, then a route; QR scan, then `+₹15` check-in reward. |
| 0:23–0:29 | **02 Do the task** | Tasks tick off one by one with the spring pop; the hero deepens to full pink. |
| 0:29–0:35 | **03 Get paid** | The reward moment: ink seal, rings, `+₹150` counting up. "Paid. Instantly." |
| 0:35–0:47 | **Businesses (dark)** | "Own a shop?" Create a hunt, set "₹15 on arrival · ₹150 on completion", verify in one tap, dashboard numbers tick up. Big line: **"Ads charge you for views. Trivvo charges you for visitors."** Small: "Unused budget? It comes back to you." |
| 0:47–0:52 | **Every place can be a hunt** | The app's object icons (coffee cup, sneaker, pizza, museum, ticket, trophy) pop into a grid on the beat. "Cafés. Stores. Gyms. Galleries." |
| 0:52–0:58 | **End** | Ink. Logo lockup, the three beats in pink: "Show up. Do the task. Get paid." Then "Trivvo — Get paid to explore your city." + **Coming soon**. Last chime. |

## The brand at a glance

Full detail in [`brand/tokens.json`](brand/tokens.json).

- **Colours:** bone `#F4F1EA` (default ground), ink `#10231C` (dark ground and text),
  pink `#FF85C7` (accent, heroes, rewards), pink-soft `#FFE8F4`, paper `#FFFFFF` (cards).
- **Font:** Plus Jakarta Sans, mostly ExtraBold with tight negative tracking; the files in
  `brand/fonts/` include the ₹ glyph.
- **Shapes:** full-bleed colour blocks with 28px rounded bottom corners, paper cards with no
  borders, pill buttons, a floating ink tab bar with a pink active pill.
- **Icons:** hand-drawn feel, thick ink outlines, flat pink fills, little pink "spark" dashes.
  Already in the repo: `frontend/public/icons/objects/` (41) and `frontend/public/icons/ui/` (70).
- **Motion:** spring overshoot `cubic-bezier(0.34, 1.56, 0.64, 1)` for things that land,
  ease-out `cubic-bezier(0.16, 1, 0.3, 1)` for things that move. The reward moment is the
  signature: see `motion.rewardMoment` in `tokens.json` and `reference/app-walkthrough-inr.mp4`.
- **Voice:** short, plain, confident. Full stops, no exclamation marks.
  "Get paid to explore your city." / "Show up. Do the task. Get paid." / "Pick one and go."

## What is in here

```text
video-kit/
├── README.md                   this file
├── brand/
│   ├── tokens.json             colours, type, shapes, motion, logo rules, voice
│   ├── fonts/                  Plus Jakarta Sans 400–800 (.ttf) + OFL licence
│   ├── logo/                   mark + lockup in default / reversed / on-pink / mono,
│   │                           stacked splash lockup, app icon; SVG + transparent PNG
│   └── sound/reward-chime.wav  the app's reward chime, rebuilt from RewardMoment.tsx
├── screens/inr/                every app screen in rupees, 1170×2532 (iPhone size);
│                               *-full.png = whole scrolling page; 07-tasks-1of3…3of3
├── reference/
│   └── app-walkthrough-inr.mp4 real motion of the app (splash, list, reward, ticks, vendor)
└── tools/
    ├── capture-screens.mjs     re-capture every screen from the live app
    ├── inr-swap.js             the capture-time USDC → ₹ / no-crypto swap
    └── make-brand-assets.py    rebuilds logo SVGs and the chime from the app source
```

### Screens and where they go

| File | Screen | Scene |
|---|---|---|
| `00-splash` | Ink splash, stacked logo | End card reference |
| `01-login` | "Get paid to explore your city." + three beats | Turn / end |
| `02-hunts` | Hunts list, `₹745 live right now` | 01 Show up |
| `03-hunt-detail` | Coffee Quest, `₹165`, `₹15 / ₹150` split | 01 Show up |
| `04-map` | Getting there (dark) | 01 Show up |
| `05-scan` | Point at the code (dark), `+₹15` | 01 Show up |
| `06-arrival-reward` | Checked in `+₹15` | 01 Show up |
| `07-tasks`, `-1of3`…`-3of3` | Checklist filling up | 02 Do the task |
| `08-reward-confirm` | Verified and paid `+₹150` | 03 Get paid |
| `09-profile` | Wild Badger, level, recent earnings | optional |
| `10-vendor-dashboard` | Budget, your hunts, views / check-ins | Businesses |
| `11-vendor-create-hunt` | Set it up | Businesses |
| `12-vendor-qr` | Your code (QR to display in store) | Businesses |
| `13-vendor-fund` | Fund the hunt, `₹1,500` | Businesses |
| `14-vendor-hunt-manage` | Hunt overview, recent check-ins | Businesses |
| `15-vendor-participants` | Hunters (names, status) | Businesses |
| `16-vendor-verify-task` | Verify a hunter, `₹150` | Businesses |
| `17-vendor-analytics` | Paid out so far, check-ins by hunt | Businesses |

## Re-capturing the screens

The demo data (Brew Lab Café, Urban Kicks, Modern Art Space) lives in
`frontend/src/lib/demoData.ts` and is shown because `OFFLINE = true` in `frontend/src/lib/api.ts`.

```bash
# Playwright must resolve: in the cloud box it is installed globally under /opt/node-tools
node video-kit/tools/capture-screens.mjs video-kit/screens/inr prefix   # ₹150
node video-kit/tools/capture-screens.mjs /tmp/out chip                   # 150 [INR]
node video-kit/tools/capture-screens.mjs /tmp/out usdc                   # the app as deployed
```

Amounts are converted at ×30 and rounded (0.5 USDC → ₹15, 5 → ₹150, 5.5 → ₹165), with Indian
digit grouping (₹4,455). Wallet addresses become names (Aarav S., Priya M., …), tx hashes become
receipt numbers (TRV-80223).

## Known issue in the deploy

Opening any link other than `/` directly (for example `https://trivvo-deploy.vercel.app/login`)
returns Vercel's 404, because there is no SPA rewrite. Fix: add a `vercel.json` with
`{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` in the folder Vercel
builds from (most likely `frontend/`).
