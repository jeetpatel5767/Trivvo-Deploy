-- Tr!vvo Database Schema
-- PostgreSQL / Supabase compatible

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendors table
CREATE TABLE vendors (
    vendor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hunts table
CREATE TABLE hunts (
    hunt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(vendor_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    location_name VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    arrival_reward DECIMAL(18, 6) NOT NULL,
    main_reward DECIMAL(18, 6) NOT NULL,
    qr_secret VARCHAR(64) NOT NULL,
    contract_hunt_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended', 'expired')),
    tasks JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants table
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hunt_id UUID NOT NULL REFERENCES hunts(hunt_id),
    wallet_address VARCHAR(42) NOT NULL,
    arrival_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    task_completed BOOLEAN DEFAULT FALSE,
    arrival_tx_hash VARCHAR(66),
    reward_tx_hash VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hunt_id, wallet_address)
);

-- Analytics table
CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hunt_id UUID NOT NULL REFERENCES hunts(hunt_id) UNIQUE,
    views INTEGER DEFAULT 0,
    qr_scans INTEGER DEFAULT 0,
    active_participants INTEGER DEFAULT 0,
    rewards_distributed DECIMAL(18, 6) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_vendors_wallet ON vendors(wallet_address);
CREATE INDEX idx_hunts_vendor ON hunts(vendor_id);
CREATE INDEX idx_hunts_status ON hunts(status);
CREATE INDEX idx_participants_hunt ON participants(hunt_id);
CREATE INDEX idx_participants_wallet ON participants(wallet_address);

-- World ID nullifiers (T07): one verified human = one claim per hunt
CREATE TABLE IF NOT EXISTS nullifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hunt_id UUID NOT NULL REFERENCES hunts(hunt_id),
    nullifier_hash VARCHAR(100) NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    action VARCHAR(100) NOT NULL,
    verification_level VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hunt_id, nullifier_hash)
);
CREATE INDEX IF NOT EXISTS idx_nullifiers_hunt ON nullifiers(hunt_id);

-- Photo proofs for tasks (T14/T15/T17): one row per attempt
CREATE TABLE IF NOT EXISTS task_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hunt_id UUID NOT NULL REFERENCES hunts(hunt_id),
    wallet_address VARCHAR(42) NOT NULL,
    task_index INTEGER NOT NULL,
    attempt INTEGER NOT NULL,
    review_status VARCHAR(20) NOT NULL CHECK (review_status IN ('approved','retry','vendor_review')),
    ai_match BOOLEAN,
    ai_confidence DECIMAL(4,3),
    ai_reason TEXT,
    zg_request_id VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_proofs_hunt_wallet ON task_proofs(hunt_id, wallet_address);

-- Vendor decision on flagged photos (T17)
ALTER TABLE task_proofs ADD COLUMN IF NOT EXISTS vendor_decision VARCHAR(10) CHECK (vendor_decision IN ('approve','reject'));
ALTER TABLE task_proofs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Hackathon changes (A4). Same SQL as database/migrations/001_hackathon.sql

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
