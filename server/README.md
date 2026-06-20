# Stooping Server

Always-on Node service for reservations and Expo push reminders.

## Required setup

1. Provision Postgres and set `DATABASE_URL`.
2. Set `APP_API_KEY` to the same value as the Expo app's `EXPO_PUBLIC_API_KEY`.
3. Keep `TIMEZONE=America/Los_Angeles`.

This service does not use Shopify Admin API credentials, does not relist inventory, and does not provide a QR/staff scanner flow. The team handles pickup and relisting manually.

Run migrations with:

```bash
npm run migrate
```

Start the service with:

```bash
npm start
```

Deploy on an always-on host such as Render, Railway, or Fly so `node-cron` jobs keep running. For serverless hosts, replace the cron jobs with the platform scheduler.
