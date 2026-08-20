import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Standard pg connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;
