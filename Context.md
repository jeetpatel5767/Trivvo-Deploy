# Context: Tr!vvo for ETHGlobal Mumbai 2026

> **Update 2026-11-05:** the current plan is in `PLAN.md` and the new task list in `tasks.json` (phases S–H). This file is now history. Sections 5, 8 and 11 below are out of date.

Read this first. It is the single source of truth for the project state, the goal, the decisions made, and the rules to follow. Task-level detail lives in `tasks.json`. Product narrative lives in `First-Draft.md`.

---

## 1. What Tr!vvo is

A location-based scavenger hunt. A vendor (shop) creates a hunt with a QR code in the store. A customer scans the QR, gets an **arrival reward**, completes **tasks** (photo proofs), and gets a **main reward** when done. Rewards are paid in stablecoin from an escrow contract.

Repo: `G:/Trivvo/Trivvo-Deploy` (git). Pre-existing app (before the hackathon) is the upstream commit `3789411` (tag `pre-event-baseline`). Everything built after that is new work for the hackathon.

---

## 2. Event and tracks (goal)

**One line:** Tr!vvo is a store-run treasure hunt where real, unique humans earn stablecoin rewards, and AI checks their photo proofs.

**Build track:** ETHGlobal **Continuity** track (extending our pre-event repo). Partner prizes only count on Continuity.

**Partner prizes we target (max 3 selected at submission):**

| Partner prize | Amount | How Tr!vvo fits |
|---|---|---|
| World: Best Use of IDKit | $2,500 (+ $2,500 Continuity IDKit prize) | Human check on arrival and on high-value rewards |
| 0G: Build with 0G PC | $5,000 (1st $2,500) | AI photo check with request IDs in the main flow |
| Hedera: No Solidity Allowed | $2,000 | Public receipt log (HCS) and reward stamp token (HTS) |

Escrow contract sits on World Chain (USDC), replacing Avalanche (see D8).

- **Event:** ETHGlobal Mumbai 2026, Nov 5–7, 2026. Submission deadline Sat Nov 7, 09:00 IST.
- **Track:** Continuity (required to win partner prizes; Classic cannot).
- **Partner prizes (max 3 selected at submission):**
  1. **World: IDKit** (our target). Build with IDKit, use a suitable credential, show success and a meaningful alternative path, and give an integration debrief.
  2. **0G: Build with 0G PC ($5,000)**, our main 0G target. Inference on 0G PC inside a main user flow, with request IDs.
  3. **Hedera: No Solidity Allowed ($2,000)**. HCS + HTS, JS SDK only. No `.sol` files in the Hedera module.
- **Dropped:** World Agent Pass (not pursued), x402, Tokenize Anything, 0G Agents That Pay, 0G Physical AI, Keep Building on 0G, Built on Hedera.
- **User goal:** at least ~$1–2K from ETHGlobal.

---

## 3. Decisions made (in order)

| # | Decision | Why |
|---|---|---|
| D1 | Use **World ID v4** flow (`rp_id` + signed request, `POST /api/v4/verify/{rp_id}`) for the backend; frontend uses `@worldcoin/idkit` 4.6.0 | Current World ID docs |
| D2 | **One verified human = one claim per hunt**, enforced by a `nullifiers` table (unique hunt_id + nullifier) | Stops one person with many wallets |
| D3 | World gate lives in the **backend** (`scan.ts`, `verify.ts`, `rewards.ts`). The escrow contract is unchanged | Avoid contract changes in 36h. Backend is trusted; state this in the debrief |
| D4 | **Tiered World check**: main reward above $5 needs a stronger credential (`document` / `secure_document` / `selfie`) | Prize requires a "minimum sufficient" credential decision |
| D5 | **0G verdict decides the outcome**: approved (auto-release, conf ≥ 0.8), retry (no match, max 5), vendor_review (unsure or 0G down). Never a silent pass | Honest fallback |
| D6 | Hedera module uses **ECDSA** key (ED25519 fails on this account). Env `HEDERA_KEY_TYPE=ecdsa` | Found by live test |
| D7 | Standing rule for frontend: **adding** screens, buttons, components is allowed; **existing** theme, colours, fonts, styling must not change. New UI reuses `frontend/src/styles/tokens.css`, `ui.css`, and `frontend/src/ui` | User request |
| D8 | **Escrow moves from Avalanche Fuji to World Chain testnet** (native USDC). Contract unchanged; only the network changes | User decision (sponsor fit, World is a sponsor) |
| D9 | **World check must not send the user out of Trivvo** in the final design. User opens World App only to verify, then comes back | User decision (UX) |
| D10 | Hunt flow must keep being explainable to sponsors | User request |

Open question raised earlier and **not yet answered**: whether the IDKit prize still applies if the World check is done via a return link, not inside the app. (User said: the user must go to World App to verify and then return to Trivvo. This is the planned approach.)

---

## 4. Plan for the World check (current, agreed)

- The user taps **Verify with World ID** on the arrival screen.
- World App opens to verify, then **returns to Trivvo** (`return_to` set to our arrival page).
- The arrival page then finishes the check (proof sent to backend, nullifier stored, reward released).
- **No visual change** to the app. No public URL needed for now (domain `trivvo.fun` is available for later deployment).
- **Status:** planned, not yet built. The current build opens the IDKit dialog on localhost (QR code and "Open World ID App" button), but the return-to flow is not yet done.

---

## 5. What is built (status by task)

Stored in `tasks.json`. Summary:

| Phase | Done | Notes |
|---|---|---|
| P0 Pre-event | 3 of 6 | T02 baseline tag done. T04 0G access done. T06 debrief template done. T01, T03, T05 are manual (T05 partly done via Hedera account) |
| P1 World gate | 5 of 6 | T09 (frontend World step) in progress |
| P2 0G photo check | 4 of 5 | T15 retry UI not built (frontend) |
| P3 Trust and status | 1 of 3 (+1 in progress) | T19 timeline not built; T20 recovery copy partly done |
| P4 Hedera | 1 done, 3 in progress | T21 module live. T22, T23, T24 partly done (see below) |
| P5 Stretch and submission | 0 of 4 (+1 in progress) | T25 rewards page backend done, UI not built |

**Total: 14 of 28 done.** Next: **T09** (finish: real World proof test and return-to-app flow).

---

## 6. Detailed build log (what was done, by area)

### 6.1 World ID (backend)
- `backend/src/services/worldId.ts`: `createRpSignature(action)` using `signRequest` from `@worldcoin/idkit-core/signing`; `verifyWorldResult` posts to `https://developer.world.org/api/v4/verify/{rp_id}`.
- `backend/src/routes/verify.ts`:
  - `POST /api/verify/world/signature` (returns `rp_id`, `sig`, `nonce`, `created_at`, `expires_at`). Live-tested.
  - `POST /api/verify/world` validates, stores the nullifier once per hunt, returns `409 duplicate_human` on repeat. Credential stored from the real proof (was hardcoded `orb`, fixed).
- Actions: `tr-vvo-arrival`, `tr-vvo-main`.
- Env: `WORLD_APP_ID`, `RP_ID`, `RP_SIGNING_KEY` (set and valid).

### 6.2 Arrival gate
- `backend/src/routes/scan.ts`: arrival reward refused with `403 human_check_required` unless a nullifier exists for hunt + wallet with action `arrival`. **Live-tested.** Failed World check leaves no participant row.

### 6.3 Tiered credential
- `backend/src/services/tier.ts`: threshold `STRONG_THRESHOLD_USD` (default 5), strong IDs from env `STRONG_CREDENTIAL_IDS` (default `secure_document,document,selfie`).
- `backend/src/routes/rewards.ts` (`POST /api/reward/main`): above threshold needs a strong credential. **Live-tested**: orb refused (`strong_credential_required`), document passes.
- **Caveat:** the exact World identifier names still need one real proof to confirm.

### 6.4 Photo check (0G)
- `backend/src/services/zgCompute.ts`: OpenAI-compatible call to `https://router-api.0g.ai/v1`, model `0gm-1.0-35b-a3b` (TEE-verified).
- **Live-tested OK**: returns verdict, confidence, and request ID (e.g. `chatcmpl-...`). The earlier `402 pay_no_balance` was fixed by funding.
- `backend/src/services/photoDecision.ts`: `decideOutcome` returns approved / retry / vendor_review. Unit-tested with 6 cases.
- `backend/src/routes/photo.ts`: `POST /api/photo-check`. Saves each attempt to `task_proofs`. Live-tested with 0G down → vendor_review.
- `database/schema.sql`: added `task_proofs` table (and `vendor_decision`, `reviewed_at` columns).

### 6.5 Vendor review queue
- `backend/src/routes/review.ts`:
  - `GET /api/reviews?huntId&vendorWallet` (owner only).
  - `POST /api/reviews/:id/decision` (owner only, once).
- **Live-tested** all 5 cases (list, wrong vendor 403, approve, repeat 409, empty after).

### 6.6 Hedera
- `backend/src/hedera/hederaClient.ts`, `hcs.ts`, `hts.ts`. Uses `@hashgraph/sdk` v2. No `.sol` files.
- Testnet account set in `backend/.env`. ECDSA key works.
- Created: **HCS topic `0.0.11307164`**, **HTS token `0.0.11307168`** (TVSTAMP).
- Live: one test receipt published (seq 1).
- **Not yet wired**: the 4 real events (hunt funded, arrival verified, photo passed, reward paid) are not written to HCS by the app flows. Token transfer (`sendStamp`) not yet run.
- `backend/src/routes/receipts.ts`: `GET /api/receipts/topic` (Mirror Node). Live-tested.

### 6.7 Rewards list
- `backend/src/routes/receipts.ts`: `GET /api/rewards?walletAddress=`. Live-tested. UI not built.

### 6.8 Frontend changes (all additive)
- `frontend/src/components/StatusLine.tsx` (new): "What's next" block with 4 steps (Arrived, Human verified, Photo passed, Paid). Added to `TasksPage.tsx`. Visible at `http://localhost:5173/tasks/demo`.
- `frontend/src/components/WorldCheck.tsx` (new): "Human check" block with "Verify with World ID" button. Uses `@worldcoin/idkit` 4.6.0 (`IDKitRequestWidget`). Maps backend `sig` → `signature`. Opens the World dialog on localhost. Added to `ArrivalRewardPage.tsx`. Visible at `http://localhost:5173/arrival-reward`.
- `frontend/src/lib/api.ts`: `OFFLINE` changed from `true` to `false` so the app calls the backend at `http://localhost:3002/api`.
- `frontend/package.json`: added `@worldcoin/idkit` 4.6.0 (only change).

### 6.9 Docs
- `First-Draft.md`: product draft (v1–v4).
- `docs/world-debrief.md`: World integration debrief template (T06). Commit `1778265`.
- `tasks.json`: task list with status, notes, decisions, blockers.

### 6.10 Database
- Supabase Postgres connected via `DATABASE_URL` (in `backend/.env`). Schema applied: `users`, `vendors`, `hunts`, `participants`, `analytics`, `nullifiers`, `task_proofs`.
- Test data inserted (test vendor, test hunt `d54c5e81-...`). Clean up before demo.

---

## 7. Running locally (current state)

- **Backend:** `cd backend && npm run dev` (or `PORT=3002 npx ts-node --transpile-only src/index.ts`). Port **3002**. Health: `http://localhost:3002/api/health`.
- **Frontend:** `cd frontend && npx vite --port 5173`. Open `http://localhost:5173`.
  - Tasks screen: `http://localhost:5173/tasks/demo`
  - Arrival screen (World check): `http://localhost:5173/arrival-reward`
- **Env names** in `backend/.env`: `DATABASE_URL`, `WORLD_APP_ID`, `RP_ID`, `RP_SIGNING_KEY`, `ZG_API_KEY`, `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `HEDERA_KEY_TYPE`, `HEDERA_TOPIC_ID`, `HEDERA_TOKEN_ID`. **Never paste values in chat or commit `.env`.**

---

## 8. Known gaps and issues

1. **World return-to-app flow not built.** Currently the IDKit dialog opens; the user must scan/tap to World App, and the return flow back to Trivvo is missing (D9).
2. **World credential identifiers** (`document`, `secure_document`, `selfie`) are config guesses. Confirm with one real proof.
3. **Frontend is in local mode**, with backend on 3002. The World step's `api.post` path was tested with a signature call only.
4. **Avalanche still in place.** Escrow, chain config, and explorer links (`avalancheFuji` in `wagmi.ts`, `ArrivalRewardPage.tsx`, `RewardConfirmPage.tsx`, `backend/src/services/blockchain.ts`, `backend/src/routes/receipts.ts` links to Snowtrace for rewards). Must move to World Chain (D8).
5. **Escrow not yet redeployed** on World Chain. Need a World Chain testnet wallet and test USDC (manual step).
6. **Hedera events not wired** into the app flows (T22). Token stamps not sent (T23).
7. **Retry UI (T15)**, **trust timeline (T19)**, **My rewards UI (T25)**, **receipt page UI (T24)**: not built.
8. **Main reward has no UI button** yet (only the backend route).
9. **0G balance** is $1; watch it during tests (B3).
10. **Old security issue in the reference repo** (`token_hunt`): hard-coded DB password and API token. Do not copy. Not part of our repo; keep it that way.
11. **Demo data:** `OFFLINE` mode is off, so demo hunts and demo participants may not show. Needs a check.

---

## 9. Manual steps still needed from the user (bold in chat)

- **T01:** Register on ETHGlobal Mumbai, Continuity track.
- **T03:** Confirm World developer portal app and actions (`tr-vvo-arrival`, `tr-vvo-main`).
- **World Chain:** create a testnet wallet and get test funds (for escrow redeploy).
- **World proof test:** on a phone with World App, do a real verification once the return flow is built (later, not now).
- **T27 / T28:** demo video and submission.

---

## 10. Working rules (for any AI continuing this)

- **Do not change the frontend look.** Only add. Reuse `tokens.css`, `ui.css`, `frontend/src/ui`.
- **Bold every manual step for the user**, with the exact info needed.
- **Keep answers short** when the user asks for short answers.
- **Test every change live** (run the server, call the endpoint, check the page) before saying done. Say what was not tested.
- **Commit in parts** (Continuity rule). Keep pre-existing code separate from new work. No single big commit. Do not commit `.env`.
- **Hedera module has no Solidity.** Escrow stays on EVM (moving to World Chain).
- **Do not paste secrets** (API keys, private keys, DB passwords) into chat or docs.
- **Ask before** deleting anything outside the project or changing system settings.
- **Keep `tasks.json` updated** after each task (status and notes).
- **After finishing a task**, suggest one next step.

---

## 11. Next steps (in order)

1. **T09:** build the World return-to-app flow (`return_to` to arrival page), no visual change. Test on localhost (phone deferred).
2. **Wire escrow to World Chain** (D8): network config, USDC address, redeploy script. Needs a World Chain testnet wallet (manual).
3. **T22 / T23:** wire the 4 Hedera events into the flows and send one stamp.
4. **T15:** retry UI (H1).
5. **T19:** trust timeline.
6. **T24 / T25 UIs:** receipt page and My rewards page.
7. **T26:** README (pre-existing vs new work, setup, sponsor sections).
8. **T27:** demo video. **T28:** submission.
