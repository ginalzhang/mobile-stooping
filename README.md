# Stooping Club Mobile App

Expo React Native + TypeScript app for the Stooping Club Berkeley mobile app challenge.

## What It Does

The app lets customers browse live Stooping Club inventory, add free items to an order, confirm contact info, open Shopify checkout, and schedule pickup reminders. It includes the required Grid, Collections, and Stroll browse modes plus About/Team/Branches content inspired by the website.

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create `.env` from `.env.example` and fill in the competition-provided tokens:

   ```sh
   cp .env.example .env
   ```

3. Start the app:

   ```sh
   npm run start
   ```

4. Open in the Expo iOS simulator, Android emulator, or Expo Go.

## Environment Variables

- `EXPO_PUBLIC_SHOPIFY_DOMAIN`: Shopify storefront domain.
- `EXPO_PUBLIC_STOREFRONT_TOKEN`: public Storefront API token.
- `EXPO_PUBLIC_CUSTOMER_ACCOUNT_TOKEN`: provided for future Customer Account API work; the current app uses guest checkout with Shopify cart `checkoutUrl`.

Do not commit real tokens.

## Demo Flow

1. Open the app and land on Shop.
2. Show Grid mode with live inventory.
3. Switch to Collections, search/filter/sort items.
4. Switch to Stroll and view one random item with an origin line.
5. Open a product, review $0.00, retail value, condition, stock, local pickup, and AI image disclosure.
6. Add up to 10 items to Order.
7. Enter name/email/phone and confirm.
8. Open Shopify checkout URL, return to the app, and show pickup reminders.
9. Show About tab for mission, timeline, team, branches, and happy customers.

## Known Limitations

- Customer Account API sign-in is not implemented because store-side customer auth setup may vary. Guest checkout through Shopify Storefront cart is implemented.
- Push notifications use Expo local notifications for demo readiness. Production push delivery would require an Expo push token service or native push backend.
- Pickup defaults to Sunday 2-3 PM at Security Public Storage in El Cerrito and is centralized in `src/constants/pickup.ts` for seasonal updates.

## Submission Checklist

- Public GitHub repository with full source.
- 3-5 minute unlisted YouTube or Loom demo.
- One-paragraph description:

  Stooping Club Mobile is a free-shopping mobile app for Stooping Club Berkeley. It pulls live Shopify inventory, lets users browse by grid, collection, or a playful one-item Stroll mode, shows standardized item details, builds a 10-item pickup order, opens Shopify checkout, and schedules Friday confirmation and Sunday pickup reminders. The app also includes mission, story, team, branches, and customer content so judges can see both the core commerce loop and the broader reuse movement.
