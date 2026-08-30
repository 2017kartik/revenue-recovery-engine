import 'dotenv/config';
import { generateRecoverySMS } from './src/aiService';

async function main() {
  try {
    console.log("Testing AI generation...");
    const res = await generateRecoverySMS('Kartik', 999, 'card_declined');
    console.log("SUCCESS:", res);
  } catch (err) {
    console.error("FAILURE:", err.message);
  }
}
main();
