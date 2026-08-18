/**
 * lib/termii.ts
 *
 * Thin wrapper around the Termii SMS API.
 * If TERMII_API_KEY is not set, logs to console instead of throwing.
 */

interface SmsParams {
  to: string;   // E.164 Nigerian phone, e.g. "+2348012345678"
  message: string;
}

export async function sendSms({ to, message }: SmsParams): Promise<void> {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) {
    console.log(`[termii stub] To: ${to}\n${message}`);
    return;
  }

  const senderId = process.env.TERMII_SENDER_ID ?? 'ibuynaija';
  const body = {
    api_key: apiKey,
    to: to.replace(/^\+/, ''), // Termii expects without leading +
    from: senderId,
    sms: message,
    type: 'plain',
    channel: 'generic',
  };

  try {
    const res = await fetch('https://v3.api.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[termii] SMS failed (${res.status}): ${text}`);
    }
  } catch (err) {
    console.error('[termii] SMS send error:', err);
  }
}
