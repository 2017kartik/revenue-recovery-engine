import express from 'express';
import dotenv from 'dotenv';
import pool from './db';
import { v4 as uuidv4 } from 'uuid';
import './worker';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Basic health check route to verify database connection
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      message: 'Successfully connected to the database',
      db_time: result.rows[0].now,
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.post('/api/webhooks/payment-failed', async (req, res) => {
  const { customer_name, amount, failure_reason } = req.body;

  // Payload validation
  if (
    typeof customer_name !== 'string' ||
    typeof amount !== 'number' ||
    typeof failure_reason !== 'string'
  ) {
    return res.status(400).json({ error: 'Bad Request: Invalid or missing fields.' });
  }

  const transaction_id = uuidv4();

  try {
    await pool.query(
      `INSERT INTO failed_transactions (id, customer_name, amount, failure_reason)
       VALUES ($1, $2, $3, $4)`,
      [transaction_id, customer_name, amount, failure_reason]
    );

    res.status(200).json({ transaction_id });
  } catch (error) {
    console.error('Error inserting failed transaction:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Express server is running on port ${port}`);
});
