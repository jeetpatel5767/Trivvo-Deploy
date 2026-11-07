# Tr!vvo 🎯

**Get paid to explore your city.** A shop funds a hunt in USDC. A real human (World ID) walks in, scans the code and is paid on arrival. They prove each task with a photo that an AI on 0G checks in seconds, and the main reward is paid automatically. Every step is written to a public Hedera log, so anyone can check the shop really paid.

Built for **ETHGlobal Mumbai 2026, Continuity track**. Live app: https://trivvo.fun

---

## What existed before vs. what is new

| | |
|---|---|
| **Before the event** | Tag [`pre-event-baseline`](../../tree/pre-event-baseline) (commit `3789411`, 2026-10-10). A working hunt app on Avalanche Fuji: vendor creates and funds a hunt in a USDC escrow, hunter checks in with a QR, vendor verifies tasks by looking at the hunter's screen and pays by typing their wallet. No identity check, no task verification, no public audit trail, payouts triggerable by anyone. |
| **Built at the event** | Every commit after the baseline tag on `main` ([compare](../../compare/pre-event-baseline...main)), split by area: docs, database, contracts, backend, frontend, fixes. |

**New during the hackathon**
- **World ID (IDKit 4.6) gate** on every payout: one verified human = one claim per hunt; a stronger credential for rewards above $5. Runs as a **World Mini App** (native verification inside World App, World App wallet via MiniKit) and in any browser.
- **0G Private Computer** writes a photo rubric for every task and judges every task photo; the verdict decides whether money moves (auto-pay / retake with a reason / vendor review).
- **Hedera** (JS SDK only, no Solidity): HCS public receipt log of every money and trust event, HTS "stamp" token per completed hunt, Mirror Node reads.
- **Escrow moved to World Chain Sepolia**; funding and withdrawals are confirmed on chain by the backend; the main reward is paid by the server only when every task has passed.
- **Security rebuilt**: wallet sign-in (EOA and Safe smart-account signatures), owner checks on every vendor route, QR secret never public, paid AI calls capped.
- Hunter flow rebuilt (QR deep link, location check, photo tasks with progress on the server, trust timeline, receipt page, stamps) and vendor flow rebuilt (review queue, countdowns, resumable funding).

---

## The three sponsors, and what breaks without each

| Sponsor | What it does in Tr!vvo | If removed |
|---|---|---|
| **World** (IDKit, World Chain) | Before any reward is paid the hunter proves they are a unique human for **this hunt**: every hunt gets its own World ID actions (`tr-vvo-<huntId>-arrival` with *Proof of Human*; rewards above $5 also need `tr-vvo-<huntId>-main` with *Passport*, *Selfie Check* or *MNC*). Proofs are verified on our backend (`POST /api/verify/world` → World's `/api/v4/verify`) and the nullifier is stored per hunt. A second wallet from the same human gets "Already claimed" and no money moves. Escrow and USDC live on World Chain. | One person with 100 wallets drains every hunt. |
| **0G Private Computer** | (1) When a hunt is created, 0G writes a one-line "what the photo must show" rubric per task. (2) Every task photo is judged by a vision model on 0G against that rubric. Approved → task passes (and if it was the last task, the main reward is paid on the spot); clear mismatch → retake with the reason (max 5); unsure or 0G down → vendor review, never a silent pass. Each verdict keeps its 0G request ID. | No automatic payouts: the vendor has to look at every photo and pay every hunter by hand. |
| **Hedera** (HCS + HTS + Mirror Node, no Solidity) | Every event (hunt funded, human verified, arrival paid, photo approved incl. 0G request ID, reward paid, stamp sent, hunt withdrawn) is published to an HCS topic. Completing a hunt sends one TVSTAMP (HTS) to the hunter's EVM address (Hedera auto-creates the account, no Hedera wallet needed). The public receipt page, vendor trust score and stamp count read from the log and the Mirror Node. | Hunters must trust the shop's word; no public proof of payouts, no vendor reputation, no stamps. |

**Why these World credentials (minimum sufficient):** the trust moment is *money leaving a shop's escrow to a person*. For small rewards the only thing that matters is "one claim per real person", so *Proof of Human* is enough and keeps the most people eligible. Above $5 a stronger, harder-to-farm credential is worth the extra step, so the main claim asks for *Passport / Selfie Check / MNC*. Nothing else about the person is collected.

---

## How it works

```
Vendor (browser)                      Backend (Express)                    Chains / services
──────────────────                    ─────────────────                    ─────────────────
create hunt ───────────────────────►  0G writes rubric per task ─────────► 0G Private Computer
fund: createHunt → approve → fund ──────────────────────────────────────► World Chain escrow
                    └─ tx hash ────►  reads HuntFunded from chain, hunt live ► Hedera HCS "hunt_funded"
QR = https://trivvo.fun/h/<id>?k=<secret>

Hunter (World App / browser)
scan QR → location check → /scan ──►  needs World nullifier for this hunt
World ID (IDKit) proof ────────────►  verify with World, store nullifier ─► HCS "human_verified"
                                      claimArrivalReward (operator) ──────► World Chain + HCS "arrival_paid"
task photo (downscaled) ───────────►  0G vision verdict ──────────────────► 0G (request ID)
                                      approved + last task → claimMainReward ► World Chain + HCS "reward_paid"
                                      TVSTAMP to hunter's EVM address ────► Hedera HTS + HCS "stamp_sent"
receipt / timeline / stamps ◄──────  events table + Mirror Node
```

The escrow contract (`contracts/contracts/TrivvoHuntEscrow.sol`, pre-existing, unchanged) only lets the backend operator release rewards, so every rule above (World check, all tasks passed, one payout) is enforced in the backend before the contract is called. That trust assumption is deliberate for this build.

---

## On-chain proofs (testnets)

| What | Where |
|---|---|
| Escrow (World Chain Sepolia, 4801) | [`0x1dE55f6527571d04069e3108C4CE558C489d9622`](https://sepolia.worldscan.org/address/0x1dE55f6527571d04069e3108C4CE558C489d9622) |
| Test USDC (MockUSDC, 6 decimals) | [`0xF480b41Db3C35C6bf770028E003b007A9a142e98`](https://sepolia.worldscan.org/address/0xF480b41Db3C35C6bf770028E003b007A9a142e98) |
| A main-reward payout | [`0x34063c3c…cbf23c`](https://sepolia.worldscan.org/tx/0x34063c3c0d54966bc1bdd3f90c1c59a8aa01035d447dad70a5b03e5a98cbf23c) |
| Hedera HCS receipt topic | [`0.0.11307164`](https://hashscan.io/testnet/topic/0.0.11307164) |
| Hedera HTS stamp token (TVSTAMP) | [`0.0.11307168`](https://hashscan.io/testnet/token/0.0.11307168) |
| A stamp transfer | [`0.0.10505594@1793941552.702541606`](https://hashscan.io/testnet/transaction/0.0.10505594-1793941552-702541606) |
| 0G request IDs | Shown on every photo verdict in the app and stored per attempt (`task_proofs.zg_request_id`) |

---

## Hedera module (No Solidity)

`backend/src/hedera/` uses only `@hashgraph/sdk`: `hcs.ts` (topic create + message submit), `hts.ts` (token create + transfer to an EVM alias), `hederaClient.ts` (ECDSA operator from env). `services/hederaReceipts.ts` writes each event to Postgres and publishes it to HCS without blocking the request; `routes/receipts.ts` serves the public receipt page, vendor trust score (`/vendors/:wallet/trust`) and stamp count (Mirror Node `/accounts/<evm>/tokens`). No Solidity is used anywhere in the Hedera part; the only Solidity in the repo is the pre-existing World Chain escrow.

---

## Run it locally

Prerequisites: Node 20+, a Postgres database (Supabase works), MetaMask.

```bash
# 1. Database
psql "$DATABASE_URL" -f database/schema.sql          # fresh install
psql "$DATABASE_URL" -f database/migrations/001_hackathon.sql   # existing pre-event database

# 2. Contracts (World Chain Sepolia; writes the addresses into backend/.env and frontend/.env)
cd contracts && npm install
npx hardhat run scripts/deploy-worldchain.ts --network worldchainSepolia
# top up test USDC later: MOCK_USDC=0x... TO=0x... npx hardhat run scripts/mint-usdc.ts --network worldchainSepolia

# 3. Backend (port 3002)
cd backend && npm install && cp .env.example .env   # fill it in
npm run dev

# 4. Frontend (port 5173)
cd frontend && npm install && npm run dev
```

**backend/.env**: `DATABASE_URL`, `SESSION_SECRET`, `PRIVATE_KEY` (operator), `CHAIN_RPC_URL`, `HUNT_ESCROW_ADDRESS`, `USDC_TOKEN_ADDRESS`, `EXPLORER_URL`, `WORLD_APP_ID`, `RP_ID`, `RP_SIGNING_KEY`, `WORLD_PORTAL_API_KEY` (creates the per-hunt actions), `ZG_API_KEY`, `ZG_MODEL`, `ZG_TRUST_MODE`, `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `HEDERA_KEY_TYPE`, `HEDERA_TOPIC_ID`, `HEDERA_TOKEN_ID`.
**frontend/.env**: `VITE_API_URL`, `VITE_HUNT_ESCROW_ADDRESS`, `VITE_USDC_TOKEN_ADDRESS`, `VITE_WORLD_APP_ID`, optional `VITE_WORLD_ENV=staging` for the World ID simulator.

Without `PRIVATE_KEY`/`HUNT_ESCROW_ADDRESS` the backend runs in demo mode (no on-chain money); without `ZG_API_KEY` every photo goes to vendor review.

---

## Security notes

- Every write and every vendor read needs a wallet sign-in token; the wallet always comes from the token, never the request body. World App (Safe) wallets are checked against the contract (ERC-1271 / Safe `checkSignatures`).
- The QR secret is only served to the hunt's owner; `/scan` checks it server-side.
- Payouts happen only on the server: World nullifier for the hunt → arrival; every task approved (+ strong credential above $5) → main reward, behind a single database lock so a reward can't be paid twice.
- Funding and withdrawals are read from the chain, never trusted from the browser.
- Keys (operator, World RP signing key, 0G key, Hedera key) stay in the backend env. Paid 0G calls require a checked-in hunter and are capped at 5 per task and 10 tasks per hunt.

World integration debrief: [`docs/world-debrief.md`](docs/world-debrief.md).
