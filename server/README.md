# Stooping Server

Backend for real reservation holds, SMS reminders, relisting, and staff pickup scans.

## What It Does

- Creates reservation records in Postgres.
- Sets Shopify Admin inventory quantity to `0` when a find is held.
- Sets Shopify Admin inventory quantity back to `1` when a hold is released or relisted.
- Sends Friday confirmation and Sunday pickup SMS through Twilio.
- Confirms reservations from inbound `YES` SMS replies.
- Provides staff-only pass-code lookup and pickup endpoints.

## Setup

```sh
cd server
npm install
cp .env.example .env
npm run migrate
npm start
```

Fill real secrets in the deployment host, not in git:

- `DATABASE_URL`
- `APP_API_KEY`
- `STAFF_API_KEY`
- `SHOPIFY_ADMIN_TOKEN`
- `SHOPIFY_LOCATION_ID`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM`

## Deploy

Use an always-on host such as Render, Railway, or Fly so `node-cron` runs. If this is moved to a serverless host, replace the cron jobs in `src/sweeper.js` with the platform scheduler.

## API

Customer app routes use `x-api-key: APP_API_KEY`.

- `POST /reservations`
- `GET /reservations/:id`
- `PATCH /reservations/:id/confirm`
- `PATCH /reservations/:id/release`

Staff routes use `x-staff-api-key: STAFF_API_KEY`.

- `GET /reservations/by-code/:passCode`
- `POST /reservations/:id/pickup`
- `POST /reservations/:id/staff-release`
- `POST /pickup`
- `GET /admin/locations`

Twilio webhook:

- `POST /sms/inbound`

