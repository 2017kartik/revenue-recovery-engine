import 'dotenv/config';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const data = [
  { customer_name: "Bruce Wayne", amount: 1500.00, failure_reason: "insufficient_funds", customer_phone: "+15550100" },
  { customer_name: "Clark Kent", amount: 45.00, failure_reason: "expired_card", customer_phone: "+15550101" },
  { customer_name: "Diana Prince", amount: 820.00, failure_reason: "bank_timeout", customer_phone: "+15550102" },
  { customer_name: "Barry Allen", amount: 15.50, failure_reason: "incorrect_otp", customer_phone: "+15550103" },
  { customer_name: "Arthur Curry", amount: 230.00, failure_reason: "do_not_honor", customer_phone: "+15550104" },
  { customer_name: "Victor Stone", amount: 1299.99, failure_reason: "insufficient_funds", customer_phone: "+15550105" },
  { customer_name: "Hal Jordan", amount: 65.00, failure_reason: "incorrect_otp", customer_phone: "+15550106" },
  { customer_name: "Oliver Queen", amount: 890.00, failure_reason: "bank_timeout", customer_phone: "+15550107" },
  { customer_name: "Dinah Lance", amount: 120.00, failure_reason: "do_not_honor", customer_phone: "+15550108" },
  { customer_name: "John Constantine", amount: 450.00, failure_reason: "expired_card", customer_phone: "+15550109" },
  { customer_name: "Tony Stark", amount: 3000.00, failure_reason: "insufficient_funds", customer_phone: "+15550110" },
  { customer_name: "Steve Rogers", amount: 75.25, failure_reason: "incorrect_otp", customer_phone: "+15550111" }
];

async function seed() {
  console.log("🚀 Starting live seed of failed transactions...");
  console.log("Recruiting Demo Mode: Injecting data slowly for UI observation\n");
  
  for (const item of data) {
    console.log(`[SEED] Injecting failed payment for ${item.customer_name} ($${item.amount})...`);
    
    try {
      const port = process.env.PORT || 4000;
      const response = await fetch(`http://localhost:${port}/api/webhooks/payment-failed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
      });
      
      if (!response.ok) {
        console.error(`[ERROR] Failed to insert ${item.customer_name}: ${response.statusText}`);
      } else {
        const result = await response.json();
        console.log(`✅ Success: Transaction queued! ID: ${result.transaction_id}`);
      }
    } catch (error) {
      console.error(`[ERROR] Network error for ${item.customer_name}:`, (error as Error).message);
    }
    
    // Wait for 2.5 seconds before sending the next one
    await delay(2500);
  }
  
  console.log("\n🎉 Live seeding complete! Watch the dashboard for AI recovery processing.");
}

seed();
