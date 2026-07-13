// Sends (or, without Twilio credentials configured, simulates) a review-request
// text to a customer once a job is finished. See /dashboard.html for the form
// that calls this, and /SETUP.md for how to provision Twilio and go live.

const MAX_NAME_LENGTH = 80;
const MAX_BUSINESS_NAME_LENGTH = 80;

function normalizePhoneToE164(raw) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function firstNameOf(fullName) {
  return String(fullName).trim().split(/\s+/)[0];
}

function buildMessage({ customerName, businessName, reviewUrl }) {
  return `Hi ${firstNameOf(customerName)}, thanks for choosing ${businessName}! Mind leaving us a quick review? ${reviewUrl}\n\nReply STOP to opt out.`;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const accessKey = process.env.DASHBOARD_ACCESS_KEY;
  if (!accessKey) {
    res.status(500).json({ error: 'server not configured' });
    return;
  }
  if (req.headers['x-dashboard-key'] !== accessKey) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const body = readBody(req);

  const customerName = String(body.customerName || '').trim();
  if (!customerName || customerName.length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: 'customerName is required (1-80 characters)' });
    return;
  }

  const phone = normalizePhoneToE164(body.phone);
  if (!phone) {
    res.status(400).json({ error: 'phone must be a valid 10-digit US number' });
    return;
  }

  const businessName = String(body.businessName || process.env.BUSINESS_NAME || '').trim();
  if (!businessName || businessName.length > MAX_BUSINESS_NAME_LENGTH) {
    res.status(400).json({ error: 'businessName is required (1-80 characters); set it in the form or the BUSINESS_NAME env var' });
    return;
  }

  const reviewUrlRaw = String(body.reviewUrl || process.env.GOOGLE_REVIEW_URL || '').trim();
  let reviewUrl;
  try {
    reviewUrl = new URL(reviewUrlRaw).toString();
  } catch {
    res.status(400).json({ error: 'reviewUrl is required and must be a valid https:// URL; set it in the form or the GOOGLE_REVIEW_URL env var' });
    return;
  }

  const message = buildMessage({ customerName, businessName, reviewUrl });

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID, TWILIO_FROM_NUMBER } = process.env;
  const isLive = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && (TWILIO_MESSAGING_SERVICE_SID || TWILIO_FROM_NUMBER));

  if (!isLive) {
    res.status(200).json({
      status: 'dry-run',
      to: phone,
      message,
      note: 'Twilio credentials are not configured — no message was sent.',
    });
    return;
  }

  const params = new URLSearchParams({ To: phone, Body: message });
  if (TWILIO_MESSAGING_SERVICE_SID) {
    params.set('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID);
  } else {
    params.set('From', TWILIO_FROM_NUMBER);
  }

  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  let twilioResponse;
  try {
    twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );
  } catch (err) {
    res.status(502).json({ status: 'error', twilioError: err.message });
    return;
  }

  const twilioData = await twilioResponse.json().catch(() => ({}));

  if (!twilioResponse.ok) {
    res.status(502).json({ status: 'error', twilioError: twilioData.message || 'Twilio request failed' });
    return;
  }

  res.status(200).json({ status: 'sent', to: phone, sid: twilioData.sid, message });
};
