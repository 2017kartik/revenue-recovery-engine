import { generateRecoverySMS } from './src/aiService';

async function runTest() {
  console.log('Thinking...');
  const result = await generateRecoverySMS("Rahul Sharma", 2499, "insufficient_funds");
  console.log("AI Output:", result);
}

runTest();