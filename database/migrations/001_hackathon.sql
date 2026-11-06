-- 001_hackathon.sql (A4): data model for the hackathon flow. Safe to run more than once.

-- One verified human = one claim per hunt, per action (arrival and main are separate checks).
ALTER TABLE nullifiers DROP CONSTRAINT IF EXISTS nullifiers_hunt_id_nullifier_hash_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_nullifiers_hunt_nullifier_action ON nullifiers(hunt_id, nullifier_hash, action);
CREATE INDEX IF NOT EXISTS idx_nullifiers_hunt_wallet ON nullifiers(hunt_id, wallet_address);

-- Photo proof itself (downscaled JPEG data URL) so the vendor can see what the AI saw.
ALTER TABLE task_proofs ADD COLUMN IF NOT EXISTS image TEXT;

-- Arrival check radius around the hunt location, in metres.
ALTER TABLE hunts ADD COLUMN IF NOT EXISTS radius_m INTEGER NOT NULL DEFAULT 150;

-- Trust timeline: one row per step, with the proof each sponsor gives
-- (World nullifier, 0G request id, Hedera HCS sequence / HTS tx, World Chain tx).
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hunt_id UUID NOT NULL REFERENCES hunts(hunt_id),
    wallet_address VARCHAR(42),
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'hunt_funded', 'human_verified', 'arrival_paid', 'photo_approved', 'reward_paid', 'stamp_sent', 'hunt_withdrawn'
    )),
    tx_hash VARCHAR(100),
    nullifier_hash VARCHAR(100),
    zg_request_id VARCHAR(200),
    hcs_topic_id VARCHAR(30),
    hcs_sequence BIGINT,
    detail JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_hunt ON events(hunt_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_wallet ON events(wallet_address, created_at);
