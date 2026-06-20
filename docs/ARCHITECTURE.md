# Architecture

This document describes the Expo React Native Stooping Club mobile app.

## App Shell

`index.js` calls Expo `registerRootComponent(App)`.

`App.tsx` is the top-level composition point:

- Installs the Stooping Club notification handler.
- Creates a TanStack React Query client with one retry and a three-minute stale time.
- Wraps the app in `SafeAreaProvider`.
- Wraps data fetching in `QueryClientProvider`.
- Wraps order state in `CartProvider`.
- Renders `StatusBar` and `AppNavigator`.

## Navigation

Navigation is defined in `src/navigation/AppNavigator.tsx`.

The app has three bottom tabs:

- `Shop`: native stack with `ShopHome` and `ProductDetail`.
- `Order`: native stack with `OrderHome` and `Confirmation`.
- `About`: native stack with `AboutHome`.

The Order tab icon displays a badge when `CartContext.totalQuantity` is greater than zero.

`src/navigation/types.ts` owns route param types. Product detail routes accept Shopify product identity through `productId` and `handle`.

## Feature Areas

### Shop

`src/features/shop/ShopScreen.tsx` is the main inventory screen.

It supports three browse modes:

- `Grid`: two-column list of products.
- `Collections`: groups the currently loaded products by resolved category.
- `Stroll`: shows one randomly queued available item at a time.

Shop uses `useInfiniteQuery` with `fetchProducts`. Product pages are flattened for rendering, and infinite loading uses Shopify cursors returned by the API client.

Important behavior:

- Pull-to-refresh calls `productsQuery.refetch()`.
- Infinite loading calls `productsQuery.fetchNextPage()`.
- Search is sent through the Shopify product query.
- Available products are filtered to `availableForSale && stockCount > 0`.
- Cached inventory is surfaced with an Offline pill/banner when any page came from cache.
- Product cards show a FREE badge, stock label, condition, `$0`, and pickup-only copy. There is no local saved/favorite state.
- Empty search and no-inventory states use different copy so judges can distinguish a filtered miss from a claimed-out drop.

### Product Detail

`src/features/product/ProductDetailScreen.tsx` fetches one product through `fetchProduct({ id, handle })`.

It renders:

- Image carousel with a page counter or branded fallback.
- Title, `$0`, condition, availability, category, estimated retail value when available, pickup details, trust rows, and item notes.
- Add-to-order action.
- Claimed/sold-out state with disabled ordering and a keep-strolling message.

When add succeeds, the screen offers to keep browsing or navigate to the Order tab.

### Cart And Checkout

`src/features/cart/CartContext.tsx` owns local order state:

- `items`
- `customer`
- `confirmation`
- `totalQuantity`

It persists state in AsyncStorage:

- `stooping.cart.v1`
- `stooping.customer.v1`
- `stooping.confirmation.v1`

`addItem` enforces:

- product must be available for sale
- total order quantity must be below `ORDER_LIMIT`
- quantity cannot exceed known stock for that variant

`src/features/cart/CartScreen.tsx` owns checkout:

1. Requires name, email, and phone.
2. Re-fetches every item through `fetchProduct` before checkout.
3. Blocks checkout when stock changed or a product is unavailable.
4. Creates a Shopify cart with `createShopifyCart`.
5. Opens `checkoutUrl` through `expo-web-browser`.
6. Saves a local confirmation.
7. Clears the local cart.
8. Navigates to `Confirmation`.

### Confirmation And Pickup Pass

`src/features/cart/ConfirmationScreen.tsx` renders the last local confirmation.

It includes:

- success state
- pickup window and address
- generated pickup code
- QR code containing code, pickup label, and item count
- item summary
- reminder controls through `NotificationPanel`

If no confirmation exists, the screen shows an empty state and points the user back to the order screen.

### Notifications

Notification code lives in `src/features/notifications/`.

`notificationUtils.ts`:

- Installs the Expo notification handler.
- Reads and requests notification permissions.
- Configures an Android notification channel.
- Cancels existing Stooping reminder notifications.
- Schedules one-shot local reminders for the specific pickup:
  - Friday confirmation reminder at 9:00 AM America/Los_Angeles when still upcoming
  - Sunday pickup reminder at 10:00 AM America/Los_Angeles when still upcoming

`NotificationPermissionCard.tsx` renders permission state, reminder schedule details, enable/refresh/cancel actions, and a settings link when notifications are denied or unavailable.

`NotificationsScreen.tsx` exists in the source tree but is not wired into the active tab or stack navigation. The active notification UI appears through `NotificationPanel` on the confirmation screen.

### About Content

`src/features/content/screens/AboutScreen.tsx` renders static mission and community content.

`src/features/content/data/aboutContent.ts` provides:

- impact stats
- story timeline
- team members
- branch director steps
- trust principles
- customer testimonials

The About screen opens `mailto:hello@stooping.club` for branch director and volunteer actions.

## Shopify Integration

`src/api/shopify.ts` is the integration boundary for Shopify Storefront GraphQL.

Environment variables:

- `EXPO_PUBLIC_SHOPIFY_DOMAIN`
- `EXPO_PUBLIC_STOREFRONT_TOKEN`

Storefront API version:

- `2026-04`

Main exported functions:

- `fetchProducts(filters, pageSize)`
- `fetchProductById(id)`
- `fetchProductByHandle(handle)`
- `fetchProduct({ id, handle })`
- `fetchCollectionDetails(cursor, pageSize)`
- `fetchCollections()`
- `fetchCategories()`
- `cartCreate(items, customer, note)`
- `createShopifyCart(input)`

Product fetches use GraphQL fragments to retrieve:

- product identity and handle
- description
- product type and tags
- availability and total inventory
- featured image and image gallery
- variants, prices, and quantity
- first collection handle/title

Product mapping resolves:

- first available variant, falling back to the first variant
- unique image URLs
- stock count from variant quantity or product total inventory
- condition from `condition:` tags
- category from useful tags, useful collection title, product type, or first tag
- formatted price from Shopify money values

The UI displays free-item pricing separately as `$0`, while Shopify price formatting is still available on the mapped product.

## Caching And Offline Behavior

Product pages are cached in AsyncStorage under `stooping.products.cache.v1`.

`fetchProducts` attempts a live Shopify request first. If that fails and cached products exist, it returns filtered/sorted cached products with `source: "cache"`. The Shop screen uses that source value to show offline messaging.

Cart, customer, and confirmation state are persisted independently in `CartContext`.

## Domain Constants

`src/constants/pickup.ts` owns pickup and order policy constants:

- label: `El Cerrito pickup`
- window: `Sunday 2-3 PM`
- address: `Security Public Storage, 1711 Eastshore Blvd, El Cerrito, CA 94530`
- timezone: `America/Los_Angeles`
- order limit: `10`

Changing the pickup schedule should happen there first, then notification copy and tests/manual validation should be reviewed.

## Shared UI And Theme

Shared UI primitives live in `src/components/`:

- `AppButton`
- `BrandLogo`
- `Chip`
- `ProductCard`
- `Screen`
- `StateView`
- `StoopyMascot`

Theme constants live in `src/theme/`:

- `colors.ts`
- `theme.ts`

The UI is mostly composed from React Native `StyleSheet` objects and centralized color/spacing/typography constants.

## Known Technical Risks

- `CartContext` guards AsyncStorage hydration and ignores malformed cart/customer/confirmation records.
- `EXPO_PUBLIC_CUSTOMER_ACCOUNT_TOKEN` is documented in env files but not used by the current guest-checkout flow.
- `estimatedRetailValue` usually maps as `Not listed`; UI logic exists for retail values but no verified Shopify field currently fills them.
- Collections mode groups currently loaded products by category. It is not a separate full collection browser despite collection helper functions existing.
- Saved/favorite items are intentionally not implemented in the current demo.
- Local notifications are order-specific demo-ready device reminders, not production remote push notifications.
- No automated tests, lint script, format script, or CI config were present in the inspected branch.
