import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzales", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
const failureReasons = ["insufficient_funds", "do_not_honor", "bank_timeout", "expired_card", "incorrect_otp"];

function getRandomName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

function getRandomAmount() {
  return parseFloat((Math.random() * (1500 - 20) + 20).toFixed(2));
}

function getRandomReason() {
  return failureReasons[Math.floor(Math.random() * failureReasons.length)];
}

async function run() {
  console.log("🧹 Clearing previous data from the database...");
  try {
    await pool.query('TRUNCATE audit_logs, failed_transactions CASCADE');
    console.log("✅ Database cleared successfully.\n");
  } catch (err) {
    console.error("❌ Error clearing database:", err);
    process.exit(1);
  }

  console.log("🚀 Starting live seed of 100 failed transactions...");
  console.log("Recruiting Demo Mode: Injecting data slowly for UI observation\n");
  
  const port = process.env.PORT || 4000;
  // If PROD_BACKEND_URL is provided, use it (stripping any trailing slash). Otherwise fallback to localhost.
  const backendUrl = process.env.PROD_BACKEND_URL 
    ? process.env.PROD_BACKEND_URL.replace(/\/$/, '') 
    : `http://localhost:${port}`;

  for (let i = 1; i <= 100; i++) {
    const item = {
      customer_name: getRandomName(),
      amount: getRandomAmount(),
      failure_reason: getRandomReason(),
      customer_phone: `+155501${String(i % 100).padStart(2, '0')}`
    };

    console.log(`[SEED ${i}/100] Injecting failed payment for ${item.customer_name} ($${item.amount})...`);
    
    try {
      const response = await fetch(`${backendUrl}/api/webhooks/payment-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      
      if (!response.ok) {
        console.error(`[ERROR] Failed to insert ${item.customer_name}: ${response.statusText}`);
      } else {
        const result = await response.json();
        console.log(`  └─ ✅ Queued! ID: ${result.transaction_id}`);
      }
    } catch (error) {
      console.error(`[ERROR] Network error for ${item.customer_name}:`, (error as Error).message);
    }
    
    // Wait for 1.2 seconds between requests (fast enough to not be boring, slow enough to look live)
    await delay(1200);
  }
  
  console.log("\n🎉 Live seeding complete! Watch the dashboard for AI recovery processing.");
  process.exit(0);
}

run();
