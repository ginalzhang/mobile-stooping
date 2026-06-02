# Stooping Club Mobile App

Expo React Native app for browsing Stooping Club Berkeley inventory, reserving free items, opening Shopify checkout, and scheduling local pickup reminders.

## Repository State

At the time this documentation was written, `origin/main` contained no tracked app files. The app source inspected for this documentation lives on `origin/stooping-club-mobile-app` at commit `18a3d4e` (`Make Stoopy wrapper transparent`).

If you are viewing this README on a branch that includes the app source, the paths below refer to files in that branch.

## What The App Does

- Shows live Shopify inventory in three browse modes: Grid, Collections, and Stroll.
- Lets customers open product details, see stock and condition, and add free items to an order.
- Enforces a 10-item order limit.
- Collects customer name, email, and phone before checkout.
- Re-checks item availability before creating a Shopify cart.
- Opens Shopify checkout with `expo-web-browser`.
- Stores a local confirmation, pickup pass, QR code, and reminder controls.
- Schedules local Expo notifications for Friday confirmation and Sunday pickup reminders.
- Includes an About tab with mission, impact, team, branch, and customer content.

## Tech Stack

- Expo 56
- React 19
- React Native 0.85
- TypeScript 6
- React Navigation bottom tabs and native stacks
- TanStack React Query for Shopify data fetching
- AsyncStorage for local cart, customer, product-cache, and confirmation state
- Expo Notifications for local pickup reminders
- Shopify Storefront GraphQL API for products and cart creation

## Project Layout

```text
App.tsx                         Root providers and app shell
index.js                        Expo entry point
app.json                        Expo app, platform, plugin, icon, and splash config
src/api/shopify.ts              Shopify Storefront API client and product mapping
src/components/                 Shared UI primitives
src/constants/pickup.ts         Pickup window, address, timezone, and order limit
src/features/cart/              Cart state, order form, checkout, confirmation pass
src/features/content/           About tab content and screen
src/features/notifications/     Local reminder permission and scheduling UI
src/features/product/           Product detail screen
src/features/shop/              Grid, Collections, and Stroll browse screen
src/navigation/                 Root tab and stack navigation
src/theme/                      Colors, spacing, typography, radii
src/types/                      Product and order domain types
assets/brand/                   App icons, splash, logo, and mascot assets
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deeper map of screens, state, data flow, and integration boundaries.

## Setup

Use npm; the app branch includes `package-lock.json`.

```sh
npm install
cp .env.example .env
npm run start
```

Fill `.env` with the competition or Shopify-provided values:

```sh
EXPO_PUBLIC_SHOPIFY_DOMAIN=stooping-club-berkeley.myshopify.com
EXPO_PUBLIC_STOREFRONT_TOKEN=replace_me
EXPO_PUBLIC_CUSTOMER_ACCOUNT_TOKEN=replace_me
```

`EXPO_PUBLIC_CUSTOMER_ACCOUNT_TOKEN` is present for future Customer Account work, but the inspected app uses guest checkout through Shopify cart `checkoutUrl`.

## Common Commands

```sh
npm run start      # expo start
npm run ios        # expo start --ios
npm run android    # expo start --android
npm run web        # expo start --web
npm run typecheck  # tsc --noEmit
```

There are no lint, test, format, or production build scripts defined in the inspected `package.json`.

## Runtime Flow

1. `index.js` registers `App.tsx`.
2. `App.tsx` installs the notification handler, creates the React Query client, and wraps the app in `SafeAreaProvider`, `QueryClientProvider`, and `CartProvider`.
3. `AppNavigator` renders three bottom tabs: Shop, Order, and About.
4. Shop fetches live Shopify products, falls back to cached products when available, and supports Grid, Collections, and Stroll modes.
5. Order validates contact info, re-fetches products to check stock, creates a Shopify cart, opens checkout, saves confirmation, and clears the cart.
6. Confirmation shows pickup details, a QR pickup pass, item summary, and local reminder controls.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): app structure, data flow, state, navigation, and integration details.
- [Development](docs/DEVELOPMENT.md): setup, env vars, commands, validation, Conductor notes, and known risks.

