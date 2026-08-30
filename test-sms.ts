import 'dotenv/config';
import { sendRecoverySMS } from './src/smsService';

async function main() {
  console.log('Sending SMS...');
  const sid = await sendRecoverySMS('+919119063420', 'Test message from Revenue Recovery Engine');
  console.log('Result SID:', sid);
  process.exit(0);
}
main().catch(console.error);
