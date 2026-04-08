import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: true
});

export default pool;
