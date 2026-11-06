# Tr!vvo — Build Plan (ETHGlobal Mumbai 2026)

> Source of truth for **what we build and why**. Progress lives in `tasks.json`.
> `Context.md` is history (decisions D1–D10 still apply unless changed below).
> Written 2026-11-05 after a full read of the code. Deadline: **Sat Nov 7, 09:00 IST**.

---

## 1. The one-line story

A shop funds a hunt in USDC. A real human (World ID) walks in, scans the code, gets paid on arrival,
proves each task with a photo that an AI on 0G checks in seconds, and gets the main reward
automatically. Every step is written to a public Hedera log, so anyone can check that the shop really paid.

## 2. Sponsor roles (each one is load-bearing)

| Sponsor | What it does in Tr!vvo | Where the user sees it | If we remove it… |
|---|---|---|---|
| **World ID** (+ World Chain) | One human = one claim per hunt (nullifier). Stronger credential for rewards > $5. Escrow + USDC live on World Chain. | Verify step at arrival; "Human verified" on the timeline; denied / duplicate screens | One person with 100 wallets drains every hunt. Rewards cannot be paid out safely at all. |
| **0G Private Computer** | (1) Writes a "what the photo must show" check for each task when the vendor creates a hunt. (2) Judges every task photo, in a TEE, with a request ID. Its verdict **decides** if money moves: auto-pay / retake / vendor review. | Rubric on the create screen; verdict card with reason, confidence, request ID on every photo | No automatic payouts. The vendor has to look at every photo by hand and pay each person manually, which doesn't scale past a few hunters. |
| **Hedera** (HCS + HTS + Mirror Node, no Solidity) | Public, tamper-proof receipt log of every money event. A "stamp" token for each completed hunt. Vendor trust score is read from the log. | Public receipt page per hunt; "N payouts verified on Hedera" on hunt cards; stamps on the profile | Hunters have to trust the shop's word. No public proof of payouts, no vendor reputation, no stamps. |

Rule: no sponsor is used only in the background. Each one changes what a user can do or see.

## 3. The full flow (final)

### Vendor (website, desktop or phone)
1. **Connect wallet** (World Chain Sepolia) and **sign a login message**. The backend gives back a session token. Every vendor action needs it.
2. **Create hunt**: title, place (lat/lng, radius), start time + duration, rewards, tasks.
   **0G** writes a short photo check for each task; the vendor can edit it. Saved as `draft`. Hunters can't see it yet.
3. **Fund**: `createHunt` → `approve USDC` → `fundHunt` on the escrow. The backend reads the `HuntCreated` / `HuntFunded`
   events **from the chain itself** (it doesn't trust the browser), then sets the hunt to `live`. **Hedera**: `hunt_funded` event.
   Countdown runs from `start_time` to `end_time`.
4. **QR code**: the code is a URL, `https://trivvo.fun/h/<huntId>?k=<secret>`. Any phone camera opens it.
   The secret never appears in public APIs.
5. **Live dashboard**: countdown, hunters, payouts, and the **review queue** (photo + AI reason + request ID → approve / reject;
   approve pays automatically).
6. **After the end**: withdraw what's left (escrow `withdrawRemaining`).

### Hunter (World Mini App inside World App; same site works in Chrome)
1. **Discover**: only `live` and `upcoming` hunts, with a countdown. A "New" badge and a notification when a hunt goes live
   (World App notifications inside World App; an in-app banner in Chrome). Each card shows the vendor's Hedera-verified payout count.
2. **Arrive**: scan the store QR → the arrival screen for that hunt. Location check (inside the radius) as a soft guard.
3. **Verify human (World)**: inside World App, a MiniKit verify (no app switch). In Chrome, IDKit sends the user to World App and back.
   The backend checks the proof and stores the nullifier. If this human already claimed → **denied screen**; no money moves.
4. **Arrival reward**: the backend operator calls `claimArrivalReward` → real tx on World Chain → reward screen with an explorer link.
   **Hedera**: `arrival_verified`.
5. **Tasks**: each task = take a photo → **0G** verdict in seconds:
   approved ✓ / retake (with the reason, max 5) / sent to the vendor (unsure, or 0G down; never a silent pass).
   Progress is stored on the server, so a refresh doesn't lose it.
6. **Main reward**: when every task is approved (by the AI or the vendor), the backend pays automatically
   (stronger World credential if > $5). **Hedera**: `reward_paid` + one **HTS stamp** to the hunter's address.
7. **History**: My rewards → per hunt a **trust timeline**: World (nullifier) · 0G (request IDs) · Hedera (HCS message links) · World Chain (tx).
   Stamps collected (read from the Mirror Node).

## 4. What is broken today (found in the code, all fixed by this plan)

| # | Problem | Where | Fix (task) |
|---|---|---|---|
| 1 | **Anyone can drain a hunt**: `/task-complete` + `/reward/main` have no auth, so any caller can pay any wallet | `routes/tasks.ts`, `routes/rewards.ts` | Sessions + payout only from the server (A1, C5) |
| 2 | **QR secret is public**: `GET /hunts` returns `h.*` including `qr_secret`, so anyone can check in from home | `routes/hunts.ts` | Hide it; vendor-only endpoint (A2) |
| 3 | **Flow order is upside down**: the backend needs World **before** scan, but the UI scans first, shows "Checked in, paid", then asks for World | `ScanPage`, `ArrivalRewardPage` | New arrival flow (C2) |
| 4 | **No real scanner**: Check in uses the secret from page state, with no camera | `ScanPage` | QR = URL + `/h/:id` route (C1) |
| 5 | **Tasks are local ticks**: no photo; refresh loses progress; "show this screen to the vendor" | `TasksPage` | Photo tasks + server progress (C4) |
| 6 | **Fake payout screen**: "Get verified" goes to "Verified and paid" with a made-up tx, and no API call | `RewardConfirmPage` | Real auto-payout (C5) |
| 7 | 0G approval and vendor approval don't connect to payout; photos aren't saved, so the vendor can't see them | `photo.ts`, `review.ts` | A4, C5, E2 |
| 8 | Photo upload fails: `express.json()` default limit is 100 KB | `index.ts` | A5 |
| 9 | **Tier gate can never pass**: `UNIQUE(hunt_id, nullifier)` means the same human can't do the `main` check after `arrival` (409) | `schema.sql` | Unique on `(hunt_id, nullifier, action)` (A4) |
| 10 | Hunts are `active` before funding, so unfunded hunts show up and can be scanned | `routes/hunts.ts` | draft → live lifecycle (A3) |
| 11 | Funding always reverts or mis-links: `startTime` is in the past (contract needs a future start); the on-chain ID is guessed from `nextHuntId` | `FundHuntPage` | B4 |
| 12 | Avalanche / Snowtrace hard-coded everywhere; backend default port 3001 vs 3002 | many | B3 |
| 13 | Demo data shows whenever the API is empty or fails, which hides real errors | `HuntsPage`, `HuntDetailPage`, `MapPage`, `ParticipantsPage`, `ScanPage` | A6 |
| 14 | Vendor "Verify" = type a wallet by hand and pay | `VerifyTaskPage` | Review queue (E2) |

## 5. Tech choices (lazy, no new frameworks)

- **Auth**: sign a fixed message with the wallet (`personal_sign`), backend checks it with `ethers.verifyMessage`
  and issues an HMAC token. No new library.
- **QR scan**: the phone's own camera (the QR is a URL). The in-app Scan button uses the browser's `BarcodeDetector` where it exists;
  otherwise it says "use your camera".
- **Photos**: shrunk in the browser to about 1024px JPEG (canvas), stored in `task_proofs.image` (text data URL). No storage service.
- **World verify**: the existing IDKit 4.6 widget everywhere. Inside World App it switches to native verify by itself
  (no app switch); in Chrome it uses QR / deep link + `return_to`. Same backend check. Stays IDKit, so the IDKit prize is safe.
  `@worldcoin/minikit-js` only for the hunter's wallet address inside World App (walletAuth) and notifications.
  Test with a staging app + simulator.worldcoin.org.
- **Chain**: World Chain Sepolia, chain id 4801, real Circle test USDC `0x6614…aEA88` (checked on chain). No MockUSDC.
- **Hedera stamps to EVM wallets**: send the HTS token to `AccountId.fromEvmAddress(0,0,wallet)`. Hedera auto-creates a
  hollow account with auto-association. **Tested live in S2: works**, and the Mirror Node reads stamps by EVM address.
- **Notifications**: World App mini-app notifications (inside World App); in-app "New" banner in Chrome. No web push.
- **Countdown**: computed from `start_time` / `end_time` on the client. No timers on the server.

## 6. Order of work and what gets cut

Today is Nov 5. The core loop comes first, so we always have something to submit.

1. **S** research (1h) → **A** foundation fixes → **B** World Chain money → **C** hunter loop → **E2** review queue. *(= submittable)*
2. **F1/F3** Hedera log + receipt page → **G1** timeline / my rewards → **H** deploy and README. *(= all 3 sponsors)*
3. **D1** 0G rubric → **F2/F4** stamps + vendor trust → **G2** notifications → **F5** stamp collection. *(= depth)*
4. Feature freeze **Nov 6, 22:00 IST**. After that: demo data, video, submission only.

Cut order if late: F5 → G2 → F4 → D1 → F2. Never cut: A1, A2, C2–C5, E2, F1, F3.

## 7. Working rules

- Look (colours, fonts, components, `tokens.css` / `ui.css` / `src/ui`) never changes. Behaviour and content may change.
- Test each task live (endpoint + screen) before marking it done; say what wasn't tested.
- Commit per task. New work stays separate from pre-existing code. Never commit `.env` or paste secrets.
- Manual steps for the user are written in **bold** with the exact info needed.
