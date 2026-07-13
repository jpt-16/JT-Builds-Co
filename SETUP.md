# Setting Up the Review Request Tool

This walks through turning the review-request texting tool (`/dashboard.html`) from a
dry-run demo into something that sends real messages. Nothing here is required to demo
the tool today — open `/dashboard.html` and submit the form; without any of the setup
below, it runs in dry run and shows you the exact text that would be sent, without
sending anything.

## 1. Create a Twilio account and register your number

Sign up at [twilio.com](https://www.twilio.com/). Before any business can text real
customers, the phone carriers have to verify the number — this is the same carrier
registration described on the [Pricing](pricing.html) and [Terms](terms.html) pages of
this site: it's reviewed by the carriers, not by Twilio or by us, and it typically takes
anywhere from a few days to a few weeks. File it as soon as you decide to go live; the
rest of your setup can happen while it's pending.

Two paths, depending on the number you use:

- **A2P 10DLC** (a standard local number) — register a **Messaging Service** in the
  Twilio console and attach your 10DLC campaign to it. Prefer this path; it also gives
  you Twilio's built-in STOP-list handling across every number in the service.
- **Toll-free verification** (an 800/833/844/etc. number) — verify the toll-free number
  directly; no Messaging Service is required, though you can still use one.

## 2. Generate an access key for the dashboard

The dashboard is a single shared password, not a full login system — enough to keep the
form from being an open relay, not a substitute for real auth if this ever serves more
than one operator. Generate one:

```sh
openssl rand -hex 20
```

You'll enter this same value into both the `DASHBOARD_ACCESS_KEY` environment variable
(below) and the dashboard's Access Key field when you use it.

## 3. Deploy to Vercel

```sh
npm install -g vercel   # if you don't already have it
vercel
```

Follow the prompts to link the project. Vercel will detect the static pages and the
`/api` function automatically — no build step.

## 4. Set environment variables

In the Vercel dashboard, under Project → Settings → Environment Variables, add:

| Variable | Required | Notes |
|---|---|---|
| `DASHBOARD_ACCESS_KEY` | Yes | From step 2. Without this set, the API refuses every request. |
| `TWILIO_ACCOUNT_SID` | For live sending | From the Twilio console. |
| `TWILIO_AUTH_TOKEN` | For live sending | From the Twilio console. Keep this secret. |
| `TWILIO_MESSAGING_SERVICE_SID` | If using a Messaging Service | Preferred over `TWILIO_FROM_NUMBER` when both are set. |
| `TWILIO_FROM_NUMBER` | If not using a Messaging Service | Your verified toll-free number, e.g. `+18005551234`. |
| `GOOGLE_REVIEW_URL` | Recommended default | Falls back to whatever's typed into the dashboard's Review URL field if unset. |
| `BUSINESS_NAME` | Recommended default | Falls back to whatever's typed into the dashboard's Business Name field if unset. |

**Set every variable for both the Production and Preview environments.** Vercel scopes
environment variables per environment; if you only check "Production" when adding the
Twilio variables, every Preview deployment URL will keep running in dry run even though
Production is live, which can look like a broken deploy when it's really just a scoping
setting.

Redeploy after adding variables — they don't apply retroactively to a running
deployment.

## 5. Test locally before you rely on it

`python3 -m http.server` (the method in the main README) serves the static pages but
does not run `/api` functions — the dashboard's form will fail to reach the endpoint.
For local testing of the actual send flow, use the Vercel CLI instead:

```sh
vercel dev
```

This runs the API function locally against whatever environment variables you've pulled
down with `vercel env pull`.

## Compliance notes — read before sending to real customers

- **Consent.** A completed job is a reasonable basis to text someone once about leaving
  a review, but it's not blanket permission for ongoing messages. Disclose it at intake
  or on the invoice — something like "by giving us your number, you agree to receive a
  one-time text asking for a review" — rather than relying on the relationship alone.
- **Sender identification.** The message template already names the business in the
  first line, which is required guidance for the first message in a conversation.
- **Quiet hours.** Several states restrict promotional texts before roughly 8am or after
  9pm in the recipient's local time. This tool does not enforce that — schedule sends
  accordingly if you're triggering them outside business hours.
- **STOP/HELP handling.** Twilio numbers and Messaging Services handle the STOP
  keyword automatically at the carrier/account level — this is not something the code in
  `api/send-review-request.js` needs to implement, and it shouldn't try to.

## What this tool intentionally does not do yet

This is a working demo/prototype for a single operator, not a multi-client product.
Before handing it to a client or a second person, it needs:

- **Real rate limiting.** The access key stops randoms on the internet from using it,
  but it isn't rate limiting — a leaked key could still be used to send a lot of texts
  quickly. Serverless functions don't hold reliable state between requests, so this needs
  an external store (e.g., Upstash Redis) rather than an in-memory counter.
- **A send history / audit log.** Nothing is persisted anywhere today — every send is
  stateless. There's no record of who was texted, when, or what was sent, beyond
  whatever your Twilio console retains.
- **A consent-capture trail**, if you want to be able to show, per customer, that they
  agreed to be texted — not just that your intake process asks for it.
- **Multi-client configuration**, if this becomes something offered to more than one
  business rather than operated by one person on their own numbers.
