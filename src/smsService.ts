import twilio from 'twilio';

// ─── Twilio Client (lazy singleton) ──────────────────────────────────────────

let _client: ReturnType<typeof twilio> | null = null;

function getClient(): ReturnType<typeof twilio> | null {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;   // graceful no-op if not configured
  if (!_client) _client = twilio(sid, token);
  return _client;
}

// ─── Public Delivery Function ─────────────────────────────────────────────────

/**
 * Sends an SMS via Twilio.
 *
 * - If TWILIO_ACCOUNT_SID / AUTH_TOKEN / FROM_NUMBER are not set, this is a
 *   silent no-op — the rest of the recovery pipeline continues unchanged.
 * - Returns the Twilio message SID on success, or null if skipped/failed.
 *
 * TRIAL ACCOUNTS: Twilio trial can only deliver to verified numbers.
 * Add your phone at https://console.twilio.com/us1/develop/phone-numbers/manage/verified
 */
export async function sendRecoverySMS(
  toPhone: string,
  body: string,
): Promise<string | null> {
  const client   = getClient();
  const fromNum  = process.env.TWILIO_FROM_NUMBER;

  if (!client || !fromNum) {
    console.log('[SMS] Twilio not configured — skipping delivery (SMS logged to audit_logs only)');
    return null;
  }

  try {
    const message = await client.messages.create({
      body,
      from: 'whatsapp:+14155238886',
      to:   `whatsapp:${toPhone}`,
    });
    console.log(`✓ [SMS] Delivered to ${toPhone} — SID: ${message.sid}`);
    return message.sid;
  } catch (err) {
    // Delivery failure is NON-fatal: the recovery record is already written.
    // Log the error but don't re-throw — we don't want to fail the BullMQ job
    // or trigger a retry just because SMS delivery failed.
    console.error(`✗ [SMS] Delivery failed to ${toPhone}:`, (err as Error).message);
    return null;
  }
}