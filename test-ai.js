require('dotenv').config();
const { generateRecoverySMS } = require('./src/aiService');

async function main() {
  try {
    const res = await generateRecoverySMS('Kartik', 999, 'card_declined');
    console.log(res);
  } catch (err) {
    console.error('Final error:', err);
  }
}
main();
