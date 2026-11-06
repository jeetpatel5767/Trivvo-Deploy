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
