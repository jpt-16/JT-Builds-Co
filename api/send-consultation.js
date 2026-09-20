// Receives the consultation form from /contact and emails it on through Resend.
// See /SETUP.md for the environment variables and the DNS records Resend needs.
//
// The form posts to this natively, with no JavaScript, so every reply here is
// either a redirect or a complete HTML page — never bare JSON that a visitor
// could end up staring at.

const LIMITS = {
  name: 100,
  business: 120,
  email: 254,
  phone: 40,
  website: 300,
  timeline: 120,
  message: 4000,
  service: 60,
  services: 12,
};

const RATE = { windowMs: 60 * 60 * 1000, max: 5 };

// Best-effort only: serverless instances are ephemeral and there can be many of
// them, so this throttles a single hot instance rather than the whole site. It
// is here to blunt a crude flood, not as real abuse protection.
const hits = new Map();

function rateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const seen = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  seen.push(now);
  hits.set(ip, seen);
  if (hits.size > 5000) hits.clear();
  return seen.length > RATE.max;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  let raw = req.body;
  if (raw === undefined || Buffer.isBuffer(raw)) {
    raw = await new Promise((resolve) => {
      let data = '';
      req.on('data', (c) => { data += c; });
      req.on('end', () => resolve(data));
      req.on('error', () => resolve(''));
    });
  }
  raw = String(raw || '');
  if (!raw) return {};

  const type = String(req.headers['content-type'] || '');
  if (type.includes('application/json')) {
    try { return JSON.parse(raw); } catch { return {}; }
  }

  // urlencoded: checkboxes repeat the key, so collect them into an array
  const params = new URLSearchParams(raw);
  const out = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

const clean = (v, max) => String(v === undefined || v === null ? '' : v)
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  .trim()
  .slice(0, max);

function listOf(value) {
  const arr = Array.isArray(value) ? value : value ? [value] : [];
  return arr
    .slice(0, LIMITS.services)
    .map((v) => clean(v, LIMITS.service))
    .filter(Boolean);
}

// Deliberately loose. A real address this rejects is worse than a junk address
// it lets through, and the reply bouncing tells you soon enough.
const emailLooksReal = (s) => /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(s);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function wantsHtml(req) {
  return String(req.headers.accept || '').includes('text/html');
}

// A self-contained page, so it renders even though this is not a site route.
function page({ status, title, heading, lines, action }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} — JT Builds Co.</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:32px;
         background:#161826; color:#EDEDF1;
         font:400 16px/1.6 'Inter', system-ui, -apple-system, sans-serif; }
  main { max-width:34rem; text-align:center; }
  h1 { font-size:clamp(24px,4vw,34px); font-weight:500; letter-spacing:-.01em; margin:0 0 18px; }
  p { color:#B4B4C2; margin:0 0 14px; }
  a { color:#9184D9; }
  .back { display:inline-block; margin-top:22px; padding:12px 26px; border-radius:4px;
          border:1px solid #9184D9; color:#9184D9; text-decoration:none;
          font-size:12px; letter-spacing:.16em; }
</style></head>
<body><main>
<h1>${escapeHtml(heading)}</h1>
${lines.map((l) => `<p>${l}</p>`).join('\n')}
<a class="back" href="${action.href}">${escapeHtml(action.label)}</a>
</main></body></html>`;
}

const CONTACT_LINE = 'Email <a href="mailto:jake@jtbuildsco.com">jake@jtbuildsco.com</a> '
  + 'or call <a href="tel:+17812489834">(781) 248-9834</a>.';

// res.send and res.json are host helpers; statusCode/setHeader/end are plain
// Node and work anywhere this might run, including a bare http server in a test.
function reply(res, status, contentType, body, headers) {
  res.statusCode = status;
  if (contentType) res.setHeader('Content-Type', contentType);
  for (const [k, v] of Object.entries(headers || {})) res.setHeader(k, v);
  res.end(body === undefined ? '' : body);
}

function fail(req, res, { status, title, heading, lines }) {
  if (wantsHtml(req)) {
    reply(res, status, 'text/html; charset=utf-8', page({
      status, title, heading, lines,
      action: { href: '/contact', label: 'BACK TO THE FORM' },
    }));
  } else {
    reply(res, status, 'application/json', JSON.stringify({ error: heading }));
  }
}

function succeed(req, res) {
  if (wantsHtml(req)) {
    // 303 so a refresh of the thank-you page does not repost the form
    reply(res, 303, null, '', { Location: '/thank-you' });
  } else {
    reply(res, 200, 'application/json', JSON.stringify({ status: 'sent' }));
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    fail(req, res, {
      status: 405, title: 'Not found', heading: 'That page expects a form.',
      lines: ['Nothing was submitted.'],
    });
    return;
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (rateLimited(ip)) {
    fail(req, res, {
      status: 429, title: 'Too many requests', heading: 'That is a few too many.',
      lines: ['Several enquiries have come from this connection in the last hour.',
        CONTACT_LINE],
    });
    return;
  }

  const body = await readBody(req);

  // Honeypot. A bot fills every field it finds; a person never sees this one.
  // Answer exactly as though it worked, so the bot learns nothing.
  if (clean(body._honey, 200)) { succeed(req, res); return; }

  const name = clean(body.name, LIMITS.name);
  const email = clean(body.email, LIMITS.email);
  if (!name || !email || !emailLooksReal(email)) {
    fail(req, res, {
      status: 400, title: 'Something is missing',
      heading: 'That did not go through.',
      lines: ['A name and a working email address are needed to reply to you.',
        CONTACT_LINE],
    });
    return;
  }

  const fields = [
    ['Name', name],
    ['Business', clean(body.business, LIMITS.business)],
    ['Email', email],
    ['Phone', clean(body.phone, LIMITS.phone)],
    ['Current website', clean(body.website, LIMITS.website)],
    ['Timeline', clean(body.timeline, LIMITS.timeline)],
    ['Services of interest', listOf(body.services).join(', ')],
  ].filter(([, v]) => v);

  const message = clean(body.message, LIMITS.message);

  const subject = `Consultation request — ${clean(body.business, LIMITS.business) || name}`;
  const text = fields.map(([k, v]) => `${k}: ${v}`).join('\n')
    + (message ? `\n\nWhat they need:\n${message}` : '')
    + `\n\n— sent from the form at https://jtbuildsco.com/contact`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
${fields.map(([k, v]) => `<tr>
<td style="padding:4px 16px 4px 0;color:#666;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td>
<td style="padding:4px 0">${escapeHtml(v)}</td></tr>`).join('\n')}
</table>
${message ? `<p style="margin:18px 0 6px;color:#666">What they need</p>
<p style="margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>` : ''}
<p style="margin:22px 0 0;color:#999;font-size:13px">Sent from the form at
<a href="https://jtbuildsco.com/contact">jtbuildsco.com/contact</a></p>
</div>`;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO || 'jake@jtbuildsco.com';
  const from = process.env.CONTACT_FROM || 'JT Builds Co. <forms@jtbuildsco.com>';

  // No key means the form cannot deliver. Say so rather than showing a thank-you
  // page for an enquiry that went nowhere.
  if (!apiKey) {
    console.error('send-consultation: RESEND_API_KEY is not set; nothing was sent.', { subject });
    fail(req, res, {
      status: 503, title: 'Form unavailable',
      heading: 'The form is not delivering right now.',
      lines: ['Nothing was sent, so please get in touch directly — it will reach me either way.',
        CONTACT_LINE],
    });
    return;
  }

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, reply_to: email, subject, text, html }),
    });
  } catch (err) {
    console.error('send-consultation: request to Resend failed', err);
    fail(req, res, {
      status: 502, title: 'Could not send',
      heading: 'That did not reach me.',
      lines: ['Something went wrong on the way. Nothing was saved, so nothing was lost.',
        CONTACT_LINE],
    });
    return;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('send-consultation: Resend rejected the message', response.status, detail);
    fail(req, res, {
      status: 502, title: 'Could not send',
      heading: 'That did not reach me.',
      lines: ['The email service turned it away. Nothing was saved, so nothing was lost.',
        CONTACT_LINE],
    });
    return;
  }

  succeed(req, res);
};
