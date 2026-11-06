# Tr!vvo — ETHGlobal Mumbai 2026 · First Draft (Strategy Doc)

> **Status:** DRAFT v1. Current thinking — not final. This file captures the flow, the sponsor rules we must satisfy, and the open decisions. Update it as we change direction.

---

## 1. What Tr!vvo is (from the code)

Location-based scavenger-hunt / foot-traffic platform.

- **Vendors** drop a geo-pin, create a hunt (arrival reward + main reward in USDC), fund an on-chain escrow, get a QR code, verify task completion, release rewards, withdraw leftover funds.
- **Hunters** scan the vendor QR on arrival → arrival reward auto-issued via blockchain → complete tasks ("take a photo", "buy a coffee") → show the vendor → main USDC reward.
- **Stack:** React/Vite + Wagmi (avalancheFuji) · Node/Express + Postgres/Supabase + Ethers.js · Solidity 0.8.20 + OpenZeppelin · Avalanche C-Chain / Fuji + local Hardhat.
- **Current weak points:** task verification is 100% manual ("show this screen to the vendor"); reward claims have no anti-Sybil protection; no intelligence.

---

## 2. THE #1 RULE — we MUST register the Continuity Track

From ETHGlobal's event page:

> **Classic "From Scratch" track:** "Projects built before the event may still participate **but won't qualify for partner prizes or the Finalist category**."

Since Tr!vvo already exists → registering **Classic = zero sponsor prizes**. We must register **Continuity Track (Ship a Feature / Extend Open Source)** and:

- Document pre-existing vs. new work (README + commit history, **no single big commit**).
- Ship meaningful new features during the hackathon window.
- Apply for up to **3 partner prizes**; if a partner has multiple tracks, we can be eligible for all of them while it counts as **1 partner prize**.

**Deadlines:** Applications close ~Nov 3, 2026 23:59 IST · Projects due Sat Nov 7, 09:00 IST · Event Nov 5–7 at Jio World Convention Centre, BKC (Devcon 8 week).

---

## 3. Sponsors, tracks & exact requirements

### 🔵 WORLD — $12,500

We are eligible for all 4 (continuity status). **One integration (World ID) unlocks all four.**

| Track | Prize | Payouts | Notes |
|---|---|---|---|
| 🚀 World ID Agent Pass | $5,000 | 1st $2.5k / 2nd $1.5k / 3rd $1k | Open — **primary** |
| 💿 World ID Agent Pass | $2,500 | 1st $1.5k / 2nd $1k | Continuity-only |
| 🪪 Best Use of IDKit | $2,500 | up to 2 × $1,250 | Open |
| 🎉 Best IDKit Use Case | $2,500 | up to 2 × $1,250 | Continuity-only |

**Rules (both Agent Pass & IDKit):**
1. Proofs are **mocked now — no sandbox app needed**; fake identities, don't rely for production.
2. Show the **complete journey**: request → user completes → validated result → protected action.
3. Show a **denied / expired / cancelled / unsuccessful path** where the protected action does NOT occur.
4. **Validate on a secure backend**; never trust unvalidated client response; never expose client secrets.
5. Include a **short integration debrief** (time to first success, friction, docs gaps, one biggest improvement).
6. IDKit: reward the **best decision about WHICH credential** (Proof of Human, Passport/NFC, Selfie Check w/ Sybil score) — minimum sufficient, not most credentials.
7. **Not a login screen** — the trust moment must gate a real, meaningful action.

**Our use:** the trust moment = **claiming a USDC reward** (money-moving action). Frontend Agent Pass/IDKit → new backend route `POST /api/verify/world` (server-side validation) → only then call `claimArrivalReward()` / `claimMainReward()` in the escrow contract. Contract already blocks double-claims (`arrivalClaimed`/`mainClaimed`) → free "denied path" demo.

---

### 🟣 0G — $15,000 (the AI sponsor)

| Track | Prize | Payouts | Eligible? |
|---|---|---|---|
| ♾️ Build with 0G PC | $5,000 | 1st $2.5k / 2nd $1.5k / 3rd $1k | ✅ **primary** |
| 🃏 Agents That Pay for Themselves | $2,000 | up to 2 × $1,000 | ✅ stretch |
| 🤖 Physical AI: Agents with a Body | $5,000 | 1st $2.5k / 2nd $1.5k / 3rd $1k | ❌ not our fit (robots) |
| 🚀 Keep Building on 0G | $3,000 | — | ❌ not eligible (not an existing 0G project) |

**Rules (Build with 0G PC):**
1. **Inference on 0G Private Computer in the main user flow, with request IDs.**
2. Working app a judge can try, with a **reason to come back tomorrow**.
3. **"One sentence on what breaks if 0G is removed."**
4. **Not wanted:** generic chat wrappers; AI that could be removed without anyone noticing.
5. **iAI bonus:** user signs in with 0G account and spends daily credits (balance visibly drops).
6. Every team gets **0G compute credits** to build/test.
7. ⚠️ "Prizes paid at 0G's discretion… not every place guaranteed" — quality bar matters.
8. Submission: public repo (README+setup), demo **<3 min**, live demo link, team names + Telegram/X.

**Our use (candidate):** AI **task verification** — hunter uploads photo proof → 0G vision model verifies it matches the task/location → confidence + **request ID** → high confidence auto-releases reward, low confidence flags vendor. *(Under re-review — see §5.)*

---

### 🟢 HEDERA — $15,000

| Track | Prize | Payouts | Eligible? |
|---|---|---|---|
| 🤖 AI Agents That Pay: x402 | $6,500 | 1st $3k / 2nd $2k / 3rd $1.5k | ✅ biggest pool |
| 🪙 Tokenize Anything (ATS / Stablecoin Studio) | $5,000 | 1st $2.5k / 2nd $1.5k / 3rd $1k | ✅ fits loyalty/reward flow |
| 🚫 No Solidity Allowed (HTS + HCS, SDKs only) | $2,000 | up to 2 × $1,000 | ✅ fits audit + loyalty |
| ♻️ Built on Hedera (Continuity) | $1,500 | — | ❌ not eligible (we're not on Hedera) |

**Rules (x402):**
1. ≥1 **x402-protected endpoint** settling on Hedera testnet/mainnet (Official x402, Ax402, Blocky402, or self-run).
2. An agent/client completes ≥1 paid request end-to-end, **no human approving**.
3. Public repo + README (setup/architecture/payment flow) + **Hedera transaction ID** of ≥1 settled payment.
4. Demo ≤5 min showing a payment settling + link on **HashScan**.
5. Extra: spending controls/budgets, agent identity (HCS-14), HCS audit-log topic, USDC/HTS settlement, Hedera Agent Kit.

**Rules (Tokenize Anything):**
1. Use **ATS or Stablecoin Studio** to issue/manage a tokenized asset or stablecoin (or a payment flow onchain).
2. Deploy + demo on Hedera testnet; contracts verified on HashScan where applicable.
3. Demo ≤5 min covering issuance, config, ≥1 lifecycle op (coupon/redemption/freeze/reserve).

**Rules (No Solidity Allowed):**
1. Hedera JS/TS or Python SDK only, **no Solidity**.
2. Use **at least 2 native services** (e.g., HTS + HCS).
3. Public repo + README; demo ≤5 min.
4. Extra: Mirror Node REST API, creative HCS use, Hedera Agent Kit.

**Our use (candidate):** Hedera = **money/trust layer, independent of 0G** — HTS loyalty/rewards tokens (vendors drop branded points alongside USDC) + HCS tamper-evident audit topic of every event (hunt created, funded, scanned, verified, paid, withdrawn). *(Under re-review — see §5.)*

---

## 4. The flow + sponsor mapping (current)

```
PHASE 0  Vendor creates hunt (plain form — NO AI)
PHASE 1  Hunter scans QR → arrival reward
            └─> 🔵 WORLD = unique human? → escrow pays
PHASE 2  Hunter submits photo proof of task
            └─> 🟣 0G = AI verifies the proof (request ID)  ← candidate AI feature
PHASE 3  Hunter claims main reward
            └─> 🔵 WORLD = human gate again → escrow pays
PHASE 4  (minor) AI recommendations / hints, tied to iAI credits  ← weak, may cut
PHASE 5  Background: every event → 🟢 HEDERA HCS audit log + HTS rewards
```

**Layers (should not collide):** 🔵 World = identity/bouncer · 🟣 0G = intelligence/brain · 🟢 Hedera = money/trust.

---

## 5. "What breaks if removed" — the load-bearing test

| Sponsor | Owns | If removed... |
|---|---|---|
| 🔵 World | Identity proof | bots farm every reward |
| 🟣 0G | AI task verification | vendor must manually eyeball every photo — can't scale |
| 🟢 Hedera | Payment audit + rewards tokens | no audit trail / no loyalty layer |

**Open question (user's POV):** World's human verification is the clear standout. 0G + Hedera need a stronger, more visible impact story or they feel like decoration.

---

## 6. Prize math (floor scenario)

3 partner-prize slots = World / 0G / Hedera. All-3rd-place floor ≈ **$3,000** (World $1k + 0G $1k + Hedera $1k). Comfortable ≈ $3k–$4.5k. Best case ≈ $15k.

---

## 7. Open decisions (TODO)

- [ ] Register Continuity Track (pre-event, non-negotiable).
- [ ] Is AI **task verification** the 0G headline? Or a stronger idea?
- [ ] Keep Phase 4 (recommendations/hints + iAI credits) or cut?
- [ ] Hedera: loyalty token + HCS audit (Tokenize $5k + No-Solidity $2k) vs x402 ($6.5k)?
- [ ] For each sponsor, apply to ALL eligible tracks (same build, more lottery tickets) — confirm.
- [ ] Final pitch line per sponsor.

---

# v2 — Improvements (proposed, not final)

## A. Flaws found in v1
1. **World binds to the wallet, not the human.** Contract keys `arrivalClaimed[huntId][user]` by wallet. A bot makes 100 wallets and still farms rewards. World must bind to the **nullifier** (one human = one claim per hunt), checked in the backend and stored in a `nullifiers` table.
2. **Two World checks = friction.** Arrival + main claim both ask for a human check. Better: one check at arrival stores the nullifier; the main claim re-uses it. A second check only for high-value payouts.
3. **Hedera was invisible.** An HCS log nobody sees is not a feature. It needs a public, clickable surface.
4. **0G "what breaks" was weak.** If the AI verdict is only a green tick, judges will say it could be removed. The verdict needs to change the outcome (auto-release vs. vendor review) and be visible.
5. **Scope.** 36-hour hackathon. Four visible features plus a contract change is too much. Priorities must be explicit (see §E).

## B. Visible trust timeline (the main upgrade)
One screen in the hunter app and one public page per hunt, showing every step with its sponsor badge:

```
✅ Arrived            🔵 Human verified (World ID)     nullifier: 0x3f…a1
✅ Photo checked      🟣 AI verdict 0.93 "matches coffee shop"  req: 0G-7c2…
✅ Logged             🟢 Hedera HCS msg #482 on topic 0.0.xxxx  [view]
✅ Paid               💰 0.50 USDC  Avalanche tx 0x9b…  [view]
```

Why this matters: judges see all three sponsors working in one 30-second glance, not three features in three places. This is the single biggest "visible" improvement.

## C. Each sponsor, made visible

| Sponsor | v1 (invisible) | v2 (visible) |
|---|---|---|
| 🔵 World | Gate on button | Human badge + nullifier on the timeline; denied path shows "Not verified, reward locked" |
| 🟣 0G | Verdict in DB | Verdict card with confidence, reason text, request ID, and **auto-release vs. vendor-review** decided by the AI |
| 🟢 Hedera | Background log | **Public hunt receipt page** that reads the HCS topic via Mirror Node: anyone can verify a hunt's payouts without trusting the vendor |

## D. Tiered trust (ties World to a real product decision)
- Arrival reward (small) → **World Proof of Human** (cheap, fast, anti-bot).
- Main reward above a threshold (e.g. > $5) → **Selfie Check / Passport** credential.
- Below threshold → no second check.

This is a concrete "minimum sufficient credential" decision, which is exactly what the Best Use of IDKit prize asks judges to reward.

## E. Scope cut for 36 hours (priority order)
1. **World nullifier gate** on arrival (contract untouched, backend table). Must ship.
2. **0G photo verification** with confidence threshold, request ID, auto-release vs. vendor-review. Must ship.
3. **Trust timeline** page (ties the three together). Must ship.
4. **Hedera HCS topic + public receipt page** (minimal: one topic, log 4 events). Should ship.
5. Tiered credential for high-value main reward. Stretch.
6. HTS loyalty token. Cut unless 1–4 are done.
7. Phase 4 hints / iAI credit sign-in. Cut.
8. x402 agent payments. Cut.

## F. Revised track targeting (same logic as v1)
- 🔵 World: Agent Pass (open + continuity) and IDKit (open + continuity). One nullifier integration covers all four.
- 🟣 0G: Build with 0G PC (primary).
- 🟢 Hedera: No Solidity Allowed (HCS + SDK, fits the minimal scope). Tokenize Anything only if we add a real token; x402 is cut.

## G. Open questions for you
- [ ] Accept the nullifier-based World gate (needs one backend table and a small contract or backend change)?
- [ ] Accept the 36-hour scope cut in §E?
- [ ] Threshold for the second credential check (e.g. $5)?

---

# v3 — Hunter (user) side improvements (proposed, not final)

## A. What the hunter feels today (from the code)
- Tasks are ticked on the phone only. Refresh = progress lost, and nothing is checked.
- "Get verified" then means "show this screen to the vendor". Hunter waits with no status.
- If a check fails, the hunter gets no reason and no next step.
- No place to see what they earned, where, or when.
- Nothing brings them back tomorrow (0G's "reason to come back" rule).

## B. Hunter improvements (3 must-ship, 1 stretch)

| # | Hunter feature | What the hunter sees | Sponsor it serves |
|---|---|---|---|
| H1 | **Instant photo feedback with retry** | Submit photo → in seconds: "Looks like a coffee shop, but the cup isn't in frame. Retake?" Unlimited retries until it passes. | 🟣 0G (AI gives a reason, request ID shown) |
| H2 | **"What's next" status line** | One line always on screen: "Arrived ✓ · Photo passed ✓ · Human check needed → Verify" | 🔵 World + 🟣 0G (drives the timeline) |
| H3 | **Plain-language failure recovery** | Every block has a message and one button. "Not verified: try again" · "Vendor is reviewing your photo, usually within 1 hour" · "Already claimed from this person's ID in this hunt" | All three |
| H4 *(stretch)* | **My rewards** | List of hunts done, USDC earned, each with the trust timeline and its Hedera receipt link | 🟢 Hedera (receipt) + Avalanche (tx) |

## C. Why each one matters
- **H1** turns the AI from a judge into a helper. The hunter isn't punished for a bad photo, they're coached. This is the strongest consumer-facing AI use, and it fits the "come back tomorrow" rule because hunters build a habit of playing.
- **H2** removes the "what do I do now?" moment. It also makes the trust timeline useful to the hunter, not just to judges.
- **H3** matters because a denied path is a judging requirement. It's also the moment a hunter quits if nothing tells them what to do.
- **H4** gives hunters a reason to return and makes the Hedera receipt visible to the person who earned the reward.

## D. What we are NOT doing for hunters (on purpose)
- Streaks, badges, leaderboards: fun, but no sponsor requirement and no time to build well.
- Social features, friend lists: out of scope for 36 hours.
- Token balances or wallet management UI: the hunter gets USDC, the wallet already shows it.

## E. Costs and risks
- H1 calls 0G on every retry. Use the free team credits and cap retries (e.g. 5 per task) to protect the budget.
- H1 needs a fast fallback: if 0G is down, show "Photo saved, vendor will review" instead of blocking the hunter. Judges will check that this is not a fake pass.
- H4 depends on H-HCS being live, so it's the first thing to cut if time runs short.

## F. Updated priority (vendor + hunter together)
1. World nullifier gate (P1, P3)
2. 0G photo check with **H1 retry** (P2)
3. **H2 status line** + trust timeline (ties P1–P5 together)
4. **H3 recovery copy** for every block
5. Hedera HCS + public receipt page (P5)
6. H4 My rewards (stretch)
7. Tiered credential above threshold (stretch)

---

# v4 — Sponsor-rule coverage check (proposed)

| Sponsor | Their rule | What our flow does | Status |
|---|---|---|---|
| 🔵 World | Official Agent Pass integration | World ID nullifier gate on arrival and high-value claims | ✅ Covered |
| 🔵 World | Full journey: request → completion → validated result → protected action | P1 and P3 gates, validated on backend before escrow pays | ✅ Covered |
| 🔵 World | Denied / expired / cancelled path where the action does NOT happen | Failed check = reward locked, H3 recovery copy | ✅ Covered (must record it for the demo) |
| 🔵 World | Validate on secure backend, no client secrets exposed | Backend verifies proof, nullifier stored server-side | ✅ Covered |
| 🔵 World | Integration debrief | Not in plan | ❌ Gap: write it in the README |
| 🔵 World (IDKit) | Best credential choice, with reason | Proof of Human for small, Selfie Check/Passport above threshold | ✅ Covered (write the reason in the pitch) |
| 🟣 0G | Inference on 0G PC in main flow, with request IDs | Photo check in P2 and H1, request ID shown | ✅ Covered |
| 🟣 0G | Working app with a reason to come back | H4 My rewards (stretch) and H1 habit loop | ⚠️ Weak until H4 is built |
| 🟣 0G | One sentence: what breaks if 0G is removed | "Vendors review every photo by hand, and fraud returns" | ✅ Write it into the README |
| 🟣 0G | Not wanted: AI that could be removed unnoticed | AI verdict decides auto-release vs. review | ✅ Covered |
| 🟣 0G | iAI bonus: sign-in with 0G account, credits go down | Not planned (hints were cut) | ➕ Optional: charge H1 retries to iAI credits |
| 🟢 Hedera (No Solidity) | No Solidity contracts, SDK only | HCS log and receipt page via Hedera SDK | ⚠️ Must keep the Hedera module free of Solidity. The escrow stays on Avalanche and must not count as the Hedera entry |
| 🟢 Hedera (No Solidity) | At least two native services (e.g. HTS + HCS) | Only HCS left, because HTS was cut in v2 | ❌ Gap: we need HTS back (even a simple reward token) or the track is disqualified |
| 🟢 Hedera (No Solidity) | Demo ≤ 5 min | Planned | ✅ Plan the video |
| 🟢 Hedera (extra) | Mirror Node REST API | Receipt page reads HCS through Mirror Node | ✅ Bonus point |

## Gaps to fix before the hackathon
1. **Hedera needs two native services.** Bring HTS back as a minimal reward token (for example, a fixed points token minted per hunt). This changes the v2 cut list.
2. **World debrief.** Write time to first success, friction, docs gaps, and one improvement. Do it during the build, not at the end.
3. **0G "come back tomorrow".** Without H4 the reason to return is weak. Keep H4 as a must-ship if the 0G track is the main target.
4. **Keep the tracks separate.** Hedera submission must show its own non-Solidity module, so judges can see the SDK part on its own.
