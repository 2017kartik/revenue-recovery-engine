import cron from 'node-cron';
import pool from './db';
import { generateRecoverySMS } from './aiService';
import { v4 as uuidv4 } from 'uuid';

cron.schedule('*/1 * * * *', async () => {
  console.log('Running background job to process failed transactions...');
  try {
    // TRANSACTION 1: The Atomic Claim (Fast)
    const claimClient = await pool.connect();
    let transactions = [];
    
    try {
      await claimClient.query('BEGIN');
      
      const result = await claimClient.query(
        `SELECT * FROM failed_transactions WHERE recovery_status = 'pending' LIMIT 5 FOR UPDATE SKIP LOCKED`
      );
      transactions = result.rows;

      if (transactions.length > 0) {
        const txIds = transactions.map(tx => tx.id);
        await claimClient.query(
          `UPDATE failed_transactions SET recovery_status = 'processing' WHERE id = ANY($1)`,
          [txIds]
        );
      }
      await claimClient.query('COMMIT');
    } catch (error) {
      await claimClient.query('ROLLBACK');
      console.error('Error claiming transactions:', error);
      return;
    } finally {
      // The database is now completely free!
      claimClient.release(); 
    }

    if (transactions.length === 0) return;

    // THE NETWORK CALL: Database-Free Zone
    for (const tx of transactions) {
      try {
        const { prompt, smsResponse } = await generateRecoverySMS(tx.customer_name, tx.amount, tx.failure_reason);
        // TRANSACTION 2: Audit & Complete (Fast)
        const saveClient = await pool.connect();
        try {
          await saveClient.query('BEGIN');
          const auditId = uuidv4();
          await saveClient.query(
            `INSERT INTO audit_logs (id, transaction_id, llm_prompt, llm_response) VALUES ($1, $2, $3, $4)`,
            [auditId, tx.id, prompt, smsResponse]
          );
          
          await saveClient.query(
            `UPDATE failed_transactions SET recovery_status = 'processed' WHERE id = $1`,
            [tx.id]
          );
          
          await saveClient.query('COMMIT');
          console.log(`Successfully recovered transaction ${tx.id}`);
        } catch (error) {
          await saveClient.query('ROLLBACK');
          console.error(`Failed to save audit for transaction ${tx.id}`, error);
        } finally {
          saveClient.release();
        }
      } catch (networkError) {
         console.error(`AI Network failure for tx ${tx.id}:`, networkError);
      }
    }
  } catch (error) {
    console.error('Critical worker error:', error);
  }
});