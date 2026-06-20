# Development

This guide documents the Expo React Native Stooping Club mobile app.

## Prerequisites

- Node.js compatible with Expo 56 and React Native 0.85.
- npm; the app branch uses `package-lock.json`.
- Expo CLI through npm scripts.
- iOS Simulator, Android Emulator, Expo Go, or web target.
- Shopify Storefront API credentials for live inventory and cart creation.

## Install

```sh
npm install
cp .env.example .env
```

Fill `.env` before running the app:

```sh
EXPO_PUBLIC_SHOPIFY_DOMAIN=stooping-club-berkeley.myshopify.com
EXPO_PUBLIC_STOREFRONT_TOKEN=replace_me
EXPO_PUBLIC_CUSTOMER_ACCOUNT_TOKEN=replace_me
```

Only `EXPO_PUBLIC_SHOPIFY_DOMAIN` and `EXPO_PUBLIC_STOREFRONT_TOKEN` are required by the runtime code. `EXPO_PUBLIC_CUSTOMER_ACCOUNT_TOKEN` is reserved for future Customer Account work.

Do not commit real tokens.

## Run

```sh
npm run start
npm run ios
npm run android
npm run web
```

The scripts map directly to Expo:

- `start`: `expo start`
- `ios`: `expo start --ios`
- `android`: `expo start --android`
- `web`: `expo start --web`

## Validate

```sh
npm run typecheck
```

This runs `tsc --noEmit`.

No test, lint, format, or production build scripts are currently defined in `package.json`.

Recommended manual smoke test:

1. Start the app with valid Shopify env vars.
2. Confirm Shop loads live products.
3. Search inventory.
4. Switch between Grid, Collections, and Stroll.
5. In Stroll, drag under the threshold and confirm the card snaps back.
6. Swipe left or press `Stroll on` and confirm the card advances, the STROLL stamp appears, Stoopy speech changes, and progress updates.
7. Swipe right or press `Reserve` and confirm the RESERVE stamp, confetti, cheer speech, and Order tab badge.
8. Fill the order to the 10-item limit and confirm a failed Stroll reserve snaps back instead of advancing.
9. Stroll through the loaded queue and confirm next-page loading or the whole-block/start-over state appears.
10. Tap the Stroll card and confirm product detail opens.
11. Search for a term with no matches and confirm the empty search copy is specific.
12. Open a product detail screen.
13. Swipe through product photos and confirm the image counter updates when multiple photos are present.
14. Confirm `$0`, pickup-only, condition, status, and reuse trust copy are visible.
15. Add one item to the order.
16. Confirm the Order tab badge updates.
17. Enter valid name, email, and phone.
18. Start checkout and confirm Shopify checkout opens.
19. Return to the app and confirm the pickup pass appears.
20. Enable and cancel pickup reminders.
21. Restart the app and confirm persisted customer/confirmation behavior is acceptable.

## Environment Variables

### `EXPO_PUBLIC_SHOPIFY_DOMAIN`

Shopify storefront domain, for example:

```sh
EXPO_PUBLIC_SHOPIFY_DOMAIN=stooping-club-berkeley.myshopify.com
```

The Shopify API client strips any protocol and trailing slash before building:

```text
https://<domain>/api/2026-04/graphql.json
```

### `EXPO_PUBLIC_STOREFRONT_TOKEN`

Public Storefront API token used in the `X-Shopify-Storefront-Access-Token` request header.

### `EXPO_PUBLIC_CUSTOMER_ACCOUNT_TOKEN`

Present in `.env.example`, but not used by the current runtime code.

## Workspace Notes

For Conductor workspaces:

- Setup scripts run from the workspace directory.
- Run scripts run from the workspace directory.
- Use Files to copy or `.worktreeinclude` for local `.env` files if every workspace needs the same Shopify credentials.
- Avoid committing `.env`; the branch `.gitignore` excludes `.env` and `.env.*` while allowing `.env.example`.
- The Stroll swipe port intentionally uses React Native core `Animated` and `PanResponder`, with no Reanimated or gesture-handler dependency.
- Expo usually supports configurable ports, but the app scripts do not currently wire `CONDUCTOR_PORT` into `expo start`.

If adding shared Conductor configuration after the app source is on the target branch, a conservative starting point is:

```json
{
  "scripts": {
    "setup": "npm install",
    "run": "npm run start"
  },
  "runScriptMode": "concurrent"
}
```

Use `nonconcurrent` instead if multiple Expo instances, simulator targets, or shared local resources conflict on a developer machine.

## Data Flow Checklist

When changing Shopify product behavior, review:

- `src/api/shopify.ts`
- `src/types/product.ts`
- `src/features/shop/ShopScreen.tsx`
- `src/features/shop/stroll/`
- `src/features/product/ProductDetailScreen.tsx`
- `src/features/cart/CartScreen.tsx`

When changing checkout behavior, review:

- `src/features/cart/CartContext.tsx`
- `src/features/cart/CartScreen.tsx`
- `src/features/cart/ConfirmationScreen.tsx`
- `src/types/order.ts`
- `src/constants/pickup.ts`

When changing reminder behavior, review:

- `src/features/notifications/notificationUtils.ts`
- `src/features/notifications/NotificationPermissionCard.tsx`
- `src/constants/pickup.ts`
- `app.json`

When changing branding, review:

- `assets/brand/`
- `app.json`
- `src/components/BrandLogo.tsx`
- `src/components/StoopyMascot.tsx`
- `src/theme/colors.ts`

## Known Limitations

- Customer Account sign-in is not implemented.
- Checkout uses Shopify guest cart creation and opens Shopify checkout URL.
- Push behavior is local Expo notifications only.
- Product cache fallback helps browsing after a failed live fetch, but checkout still needs live Shopify availability checks.
- Retail value display is present in the UI, but mapped products currently use `Not listed`.
- Collections mode groups loaded products locally instead of fetching all collections as independent shelves.
- Saved/favorite items are not implemented; product cards use a FREE badge instead of a noninteractive heart.
- Corrupt AsyncStorage JSON for cart/customer/confirmation should be ignored during guarded hydration.
