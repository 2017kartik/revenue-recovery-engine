import cron from 'node-cron';
import pool from './db';
import { generateRecoverySMS } from './aiService';
import { v4 as uuidv4 } from 'uuid';

cron.schedule('*/1 * * * *', async () => {
  console.log('Running background job to process failed transactions...');
  try {
    // Fetch up to 5 pending transactions
    const { rows: transactions } = await pool.query(
      `SELECT * FROM failed_transactions WHERE recovery_status = 'pending' LIMIT 5`
    );

    if (transactions.length === 0) {
      return;
    }

    for (const tx of transactions) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const smsResponse = await generateRecoverySMS(tx.customer_name, tx.amount, tx.failure_reason);

        // Reconstructing the prompt for audit purposes as it matches aiService logic
        const prompt = `Act as a helpful support agent. Write a polite, concise, single-sentence SMS to a customer named ${tx.customer_name} about their failed payment of $${tx.amount} due to '${tx.failure_reason}'.`;

        const auditId = uuidv4();
        await client.query(
          `INSERT INTO audit_logs (id, transaction_id, llm_prompt, llm_response)
           VALUES ($1, $2, $3, $4)`,
          [auditId, tx.id, prompt, smsResponse]
        );

        await client.query(
          `UPDATE failed_transactions SET recovery_status = 'processed' WHERE id = $1`,
          [tx.id]
        );

        await client.query('COMMIT');
        console.log(`Successfully processed and recovered transaction ${tx.id}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Failed to process transaction ${tx.id}. Rolled back. Error:`, error);
      } finally {
        client.release();
      }
    }
  } catch (error) {
    console.error('Error fetching transactions in worker:', error);
  }
});
