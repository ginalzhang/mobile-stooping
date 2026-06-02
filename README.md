# Stooping Club Mobile App

Expo React Native + TypeScript app for browsing Stooping Club Berkeley inventory, reserving free items, opening Shopify checkout, and scheduling local pickup reminders.

## What The App Does

- Shows live Shopify inventory in three browse modes: Grid, Collections, and randomized Stroll.
- Falls back to cached inventory when Shopify is unavailable, including offline Stroll through saved items.
- Lets customers open product details, see stock, condition, estimated retail value when available, and pickup details.
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

`EXPO_PUBLIC_CUSTOMER_ACCOUNT_TOKEN` is present for future Customer Account work, but the app uses guest checkout through Shopify cart `checkoutUrl`.

Do not commit real tokens.

## Common Commands

```sh
npm run start      # expo start
npm run ios        # expo start --ios
npm run android    # expo start --android
npm run web        # expo start --web
npm run typecheck  # tsc --noEmit
```

## Demo Flow

1. Open the app and land on Shop.
2. Show Grid mode with live inventory.
3. Switch to Collections and search inventory.
4. Switch to Stroll and show randomized one-item browsing.
5. Search for a term with no matches to show the empty search state.
6. Open a product, review $0 price, condition, status, and pickup details.
7. Add up to 10 items to Order.
8. Enter name/email/phone and confirm.
9. Open Shopify checkout URL, return to the app, and show pickup pass/reminders.
10. Show About tab for mission, timeline, team, branches, and customer content.

## Runtime Flow

1. `index.js` registers `App.tsx`.
2. `App.tsx` installs the notification handler, creates the React Query client, and wraps the app in `SafeAreaProvider`, `QueryClientProvider`, and `CartProvider`.
3. `AppNavigator` renders three bottom tabs: Shop, Order, and About.
4. Shop fetches live Shopify products, falls back to cached products when available, and supports Grid, Collections, and Stroll modes.
5. Order validates contact info, re-fetches products to check stock, creates a Shopify cart, opens checkout, saves confirmation, and clears the cart.
6. Confirmation shows pickup details, a QR pickup pass, item summary, and local reminder controls.

## Known Limitations

- Customer Account API sign-in is not implemented because store-side customer auth setup may vary. Guest checkout through Shopify Storefront cart is implemented.
- Push notifications use Expo local notifications for demo readiness. Production push delivery would require an Expo push token service or native push backend.
- Pickup defaults to Sunday 2-3 PM at Security Public Storage in El Cerrito and is centralized in `src/constants/pickup.ts` for seasonal updates.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): app structure, data flow, state, navigation, and integration details.
- [Development](docs/DEVELOPMENT.md): setup, env vars, commands, validation, Conductor notes, and known risks.

## Submission Description

Stooping Club Mobile is a free-shopping mobile app for Stooping Club Berkeley. It pulls live Shopify inventory, lets users browse by grid, collection, or a playful randomized Stroll mode, supports cached offline browsing, shows standardized item status and pickup details, builds a 10-item pickup order, opens Shopify checkout, and schedules Friday confirmation and Sunday pickup reminders. The app also includes mission, story, team, branches, and customer content so judges can see both the core commerce loop and the broader reuse movement.
