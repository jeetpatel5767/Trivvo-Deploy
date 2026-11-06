# World integration debrief (Tr!vvo)

## What we built
- **Trust moment:** money leaving a shop's escrow to a person. Before any reward is paid, the hunter proves they are a unique human **for this hunt**.
- **Credentials (minimum sufficient):**
  - Arrival reward (small): `tr-vvo-arrival` with the *Proof of Human* preset. Enough to stop one person farming a hunt with many wallets; keeps the most people eligible.
  - Main reward above $5: `tr-vvo-main` asking for *Passport*, *Selfie Check* or *MNC* (`any(...)`, no legacy proofs). Harder to farm, worth the extra step only when the payout is worth it.
- **Flow:** backend signs the RP request (`POST /api/verify/world/signature`, key never leaves the server) → IDKit 4.6 widget → full result to `POST /api/verify/world` → forwarded to `developer.world.org/api/v4/verify/{rp_id}` → nullifier stored per (hunt, action) → only then does the backend call the escrow.
- **Denied path:** the same human with a second wallet on the same hunt gets `409 duplicate_human`, the app shows "Already claimed by this human" and no money moves. A cancelled or failed check also leaves the reward locked.
- **Mini App:** the same site runs inside World App. IDKit switches to native verification there by itself, and MiniKit's wagmi connector gives the hunter their World App wallet, so they never leave the app.

## Time to first success
- First signed RP request + IDKit dialog opening on localhost: same day we started (2026-11-05).
- First real proof verified and stored end to end (arrival `proof_of_human`, main `document`): 2026-11-06 (confirm the exact hours).

## Friction
1. **Two SDKs, unclear which one a Mini App needs.** We expected to need MiniKit's `verify` inside World App. Reading `@worldcoin/idkit-core` showed IDKit 4.6 already detects World App (`isInWorldApp`) and verifies natively, so MiniKit was only needed for the wallet. This is not obvious from the docs.
2. **Credential identifiers.** The names returned in v4 results (`proof_of_human`, `passport`, `selfie`, `mnc`, plus legacy ones like `document`) were not listed in one place; we found them in the type definitions and confirmed them with a live proof.
3. **Errors from our own backend are swallowed by the widget.** If `handleVerify` throws, the widget reports only `failed_by_host_app`, so our `duplicate_human` code was lost and we had to carry it through a ref ourselves.
4. **Re-verification.** A user who already verified for a hunt and verifies again gets the same nullifier; we had to make our endpoint treat "same wallet, same nullifier" as success, or returning users were locked out.
5. **One verification per person per action, for life.** We first used one shared action for every hunt, so a hunter could verify for their first hunt only; World App answered "Already verified" for every later hunt. The fix World recommends is a separate action per one-time operation: the backend now creates `tr-vvo-<huntId>-arrival` / `-main` through the Developer Portal API (`POST /api/v2/create-action/{app_id}`, `max_verifications: 1`) the first time a hunt needs it, and only accepts proofs whose `action` is that hunt's. The create-action endpoint is only documented as a v2 "incognito action" route, which made it unclear at first whether it works with v4 RP-signed requests.
6. **Smart-account wallets.** World App wallets are Safes, so a plain `personal_sign` check fails; we added ERC-1271 / Safe `checkSignatures` verification on World Chain to sign hunters in.

## Missing capability / documentation
- One page that lists every credential identifier a v4 result can carry, and which presets produce which.
- A documented way for `handleVerify` to return a structured refusal that reaches `onError`.
- A clear statement that IDKit inside a Mini App needs no MiniKit `verify`.

## The one improvement with the biggest impact
Let `handleVerify` reject with a code and message that the widget passes to `onError` unchanged. Every app that adds its own rule on top of World ID (one claim per event, eligibility, limits) needs to show *why* it refused, and today that reason is lost.

## Trust note
The escrow contract is unchanged; the World gate runs in our backend, which is the only address allowed to release rewards. This is stated in the README.
