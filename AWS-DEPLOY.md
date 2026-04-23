# AWS Deployment

This project can be deployed to AWS in two modes.

## Static S3 demo

Use this for the public PWA/demo experience. The UI remains offline-first and stores data in the browser. Server-only features such as shared backend persistence and secure Stripe Checkout are not available in this mode.

Prerequisites:

- AWS CLI installed
- AWS CLI authenticated with an account that can create and update S3 buckets
- A globally unique S3 bucket name

Verify AWS access:

```powershell
aws sts get-caller-identity
```

Deploy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/deploy-aws-s3.ps1 -BucketName your-unique-bucket-name -Region eu-central-1
```

The script builds `dist/pages`, creates the bucket when needed, enables S3 static website hosting, applies a public read policy, uploads the app, and prints the website URL.

## Backend mode

Use backend mode when you need server-side app-state storage, secure Stripe Checkout Sessions, or Stripe webhooks.

Build the backend package:

```powershell
npm.cmd run build:package
```

The package is written to `dist/personnel-tracking-system-pro-v1.0.1.zip`.

Runtime environment variables:

```text
PORT=8080
BASE_URL=https://your-production-domain.example
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

The bundled backend stores app state on local disk under `data/`. That is fine for a single demo instance, but production deployments should move this state to durable storage such as S3, DynamoDB, RDS, or EFS before scaling or relying on it for business records.
