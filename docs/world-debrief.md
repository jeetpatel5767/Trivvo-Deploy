# World integration debrief (Tr!vvo)

## What we integrated
- World ID 4.0 proof gate on the arrival reward (`POST /api/verify/world`), main reward (`/api/reward/main`) tier gate.
- Actions: `tr-vvo-arrival`, `tr-vvo-main`. Nullifiers stored per hunt (unique hunt_id + nullifier).
- Signed request: `POST /api/verify/world/signature` (RP signing key stays on the backend).

## What worked
- (fill) Result verification round-trip with a real World App proof.

## What broke or was confusing
- (fill) Credential identifiers for stronger tiers were not confirmed with a live proof.
- (fill) Doc gaps or confusing errors.

## Suggestions for World
- (fill)

## Trust note
- The reward contract is unchanged. The World gate runs in the backend, which is trusted. Stated in the README.
