import dns from 'dns';
dns.setDefaultResultOrder('ipv4first'); // Force IPv4 for Supabase connectivity

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

pool.on('connect', () => {
    console.log('📦 Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('Unexpected DB error:', err);
});

export default pool;
