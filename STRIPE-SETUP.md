# Stripe Checkout Setup

The backend creates Checkout Sessions server-side so the Stripe secret key is never exposed to the browser.

## Required configuration values

| Key | Where to set | Description |
|-----|-------------|-------------|
| `STRIPE_SECRET_KEY` | env var or `application.properties` | Stripe secret key (`sk_test_…` or `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | env var or `application.properties` | Stripe webhook signing secret (`whsec_…`) |
| `BASE_URL` | env var or `application.properties` (`app.base-url`) | Public URL of the deployed app |
| `PORT` | env var or `application.properties` (`server.port`) | Port the server listens on (default: 8080) |

Environment variables take precedence over `application.properties` values, which makes it easy to override settings in production without changing committed files.

## Local development setup

1. Copy the `application.properties` file and fill in your Stripe test keys:

   ```properties
   server.port=8080
   stripe.secret.key=sk_test_YOUR_TEST_KEY_HERE
   stripe.webhook.secret=whsec_YOUR_WEBHOOK_SECRET_HERE
   app.base-url=http://localhost:8080
   ```

2. Start the server:

   ```bash
   npm start
   ```

3. Open `http://localhost:8080` in your browser and test the `Starter` or `Growth` checkout flow.

## Webhook setup

Webhooks allow Stripe to notify your server when a payment completes (or fails).

### Local testing with Stripe CLI

```bash
stripe listen --forward-to http://localhost:8080/api/webhook/stripe
```

Copy the webhook signing secret printed by the CLI (`whsec_…`) into your `application.properties` or `STRIPE_WEBHOOK_SECRET` environment variable.

### Production webhook configuration

1. In your [Stripe Dashboard](https://dashboard.stripe.com/webhooks), add an endpoint:
   - **URL**: `https://your-domain.com/api/webhook/stripe`
   - **Events to listen for**: `checkout.session.completed` (add others as needed)
2. Copy the signing secret (`whsec_…`) and set it as `STRIPE_WEBHOOK_SECRET` in your deployment environment.

The server verifies every webhook request using HMAC-SHA256 and rejects any request with an invalid or missing signature.

## What the integration does

- Creates a Stripe Checkout Session for the `Starter` and `Growth` plans entirely on the backend.
- Passes `client_reference_id` and plan metadata to Stripe so you can correlate sessions with your records.
- Verifies incoming webhook events using the Stripe signature header.
- Logs `checkout.session.completed` events with session ID, plan key, and checkout reference.
- The Stripe secret key never leaves the server.
- The `White Label` plan continues to open a pre-filled email draft instead of a Stripe checkout.

## Environment variable reference

```bash
# Required for live payments
STRIPE_SECRET_KEY=sk_live_…

# Required for webhook signature verification
STRIPE_WEBHOOK_SECRET=whsec_…

# Optional overrides (fall back to application.properties)
PORT=8080
BASE_URL=https://your-domain.com
```

## Notes

- If the backend is not running, the frontend still works as a local demo.
- If `stripe.secret.key` is missing or does not match the `sk_test_…` / `sk_live_…` format, checkout requests return HTTP 503 with a clear error message.
- If `stripe.webhook.secret` is not set, webhook POST requests return HTTP 400.
