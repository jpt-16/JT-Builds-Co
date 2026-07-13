const SESSION_KEY = 'jtbc_dashboard_access_key';

const form = document.getElementById('review-form');
const keyField = document.getElementById('f-key');
const submitBtn = form.querySelector('button[type="submit"]');
const result = document.getElementById('result');
const resultTag = document.getElementById('result-tag');
const resultNote = document.getElementById('result-note');
const resultMessage = document.getElementById('result-message');

const savedKey = sessionStorage.getItem(SESSION_KEY);
if (savedKey) keyField.value = savedKey;

function normalizeDigits(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

function showResult({ tag, note, message }) {
  resultTag.textContent = tag;
  resultNote.textContent = note || '';
  resultMessage.textContent = message || '';
  result.hidden = false;
  if (tag === 'SENT') {
    result.setAttribute('data-sent', '');
  } else {
    result.removeAttribute('data-sent');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const accessKey = keyField.value.trim();
  const customerName = form.customerName.value.trim();
  const phoneDigits = normalizeDigits(form.phone.value);
  const businessName = form.businessName.value.trim();
  const reviewUrl = form.reviewUrl.value.trim();

  if (!accessKey) {
    showResult({ tag: 'ERROR', note: 'Access key is required.' });
    return;
  }
  if (!customerName) {
    showResult({ tag: 'ERROR', note: 'Customer name is required.' });
    return;
  }
  if (phoneDigits.length !== 10 && !(phoneDigits.length === 11 && phoneDigits.startsWith('1'))) {
    showResult({ tag: 'ERROR', note: 'Enter a valid 10-digit US phone number.' });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'SENDING…';

  try {
    const response = await fetch('/api/send-review-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dashboard-Key': accessKey,
      },
      body: JSON.stringify({ customerName, phone: phoneDigits, businessName, reviewUrl }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showResult({ tag: 'ERROR', note: data.error || data.twilioError || `Request failed (${response.status}).` });
      return;
    }

    sessionStorage.setItem(SESSION_KEY, accessKey);

    if (data.status === 'dry-run') {
      showResult({ tag: 'DRY RUN', note: data.note, message: data.message });
    } else if (data.status === 'sent') {
      showResult({ tag: 'SENT', note: `Twilio SID: ${data.sid}`, message: data.message });
    } else {
      showResult({ tag: 'ERROR', note: data.twilioError || 'Unexpected response.' });
    }
  } catch (err) {
    showResult({ tag: 'ERROR', note: err.message });
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'SEND REVIEW REQUEST';
  }
});
