require('dotenv').config();
const twilio = require('twilio');

async function test() {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  try {
    console.log("Sending to +919119063420 from whatsapp:+14155238886");
    const msg = await client.messages.create({
      body: 'Test direct Twilio',
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+919119063420'
    });
    console.log("Success! SID:", msg.sid);
  } catch(e) {
    console.error("Twilio Error:", e.message);
  }
}
test();
