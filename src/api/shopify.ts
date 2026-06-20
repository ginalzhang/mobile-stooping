import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CartItem, CustomerInfo } from "../types/order";
import type { Product, ProductFilters, ProductPage, ProductSort } from "../types/product";

declare const process: {
  env: Record<string, string | undefined>;
};

const STOREFRONT_API_VERSION = "2026-04";
const DEFAULT_PAGE_SIZE = 20;
const MAX_IMAGES = 8;
const MAX_VARIANTS = 10;
const MAX_COLLECTIONS = 50;
const PRODUCT_CACHE_KEY = "stooping.products.cache.v1";
const SYSTEM_COLLECTION_TITLES = new Set([
  "smart products filter index - do not delete",
  "shop (in-stock)"
]);

const SHOPIFY_DOMAIN = process.env.EXPO_PUBLIC_SHOPIFY_DOMAIN;
const STOREFRONT_TOKEN = process.env.EXPO_PUBLIC_STOREFRONT_TOKEN;

export type ShopifyCollection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  imageUrl: string | null;
};

export type CartCreateResult = {
  cartId: string;
  checkoutUrl: string;
};

export type CreateShopifyCartInput = {
  items: CartItem[];
  customer?: CustomerInfo;
  note?: string;
};

type ShopifyMoney = {
  amount: string;
  currencyCode: string;
};

type ShopifyImage = {
  url: string;
  altText?: string | null;
};

type ShopifyVariant = {
  id: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  price: ShopifyMoney;
};

type ShopifyProductNode = {
  id: string;
  handle: string;
  title: string;
  description?: string | null;
  productType?: string | null;
  tags: string[];
  availableForSale: boolean;
  totalInventory?: number | null;
  featuredImage?: ShopifyImage | null;
  images: Connection<ShopifyImage>;
  variants: Connection<ShopifyVariant>;
  collections?: Connection<Pick<ShopifyCollection, "handle" | "title">>;
};

type Connection<T> = {
  edges: Array<{
    cursor?: string;
    node: T;
  }>;
  pageInfo?: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

type GraphQLError = {
  message: string;
  extensions?: {
    code?: string;
  };
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

type ShopifyUserError = {
  field?: string[] | null;
  message: string;
};

type ProductCachePayload = {
  cachedAt: string | null;
  products: Product[];
};

type ShopifyRequestErrorOptions = {
  code?: string;
  status?: number;
  userErrors?: ShopifyUserError[];
};

export class ShopifyRequestError extends Error {
  code?: string;
  status?: number;
  userErrors?: ShopifyUserError[];

  constructor(message: string, options: ShopifyRequestErrorOptions = {}) {
    super(message);
    this.name = "ShopifyRequestError";
    this.code = options.code;
    this.status = options.status;
    this.userErrors = options.userErrors;
  }
}

const PRODUCT_FRAGMENT = `
  fragment StoopingProductFields on Product {
    id
    handle
    title
    description
    productType
    tags
    availableForSale
    totalInventory
    featuredImage {
      url
      altText
    }
    images(first: ${MAX_IMAGES}) {
      edges {
        node {
          url
          altText
        }
      }
    }
    variants(first: ${MAX_VARIANTS}) {
      edges {
        node {
          id
          availableForSale
          quantityAvailable
          price {
            amount
            currencyCode
          }
        }
      }
    }
    collections(first: 1) {
      edges {
        node {
          handle
          title
        }
      }
    }
  }
`;

export async function fetchProducts(
  filters: ProductFilters = {},
  pageSize = DEFAULT_PAGE_SIZE
): Promise<ProductPage> {
  try {
    const page = filters.category
      ? await fetchProductsByCollection(filters.category, filters, pageSize)
      : await fetchProductsFromStorefront(filters, pageSize);

    await cacheProducts(page.products);

    return { ...page, source: "live" };
  } catch (error) {
    const cached = await readCachedProducts();

    if (cached.products.length > 0) {
      return {
        products: applyClientProductFilters(
          sortCachedProducts(cached.products, filters.sort),
          filters
        ),
        nextCursor: null,
        hasNextPage: false,
        source: "cache",
        cachedAt: cached.cachedAt,
        cacheAgeMs: getCacheAgeMs(cached.cachedAt)
      };
    }

    throw error;
  }
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const response = await storefrontRequest<{
    node: ShopifyProductNode | null;
  }>(
    `${PRODUCT_FRAGMENT}
    query ProductById($id: ID!) {
      node(id: $id) {
        ... on Product {
          ...StoopingProductFields
        }
      }
    }`,
    { id }
  );

  return response.node ? mapProduct(response.node) : null;
}

export async function fetchProductByHandle(handle: string): Promise<Product | null> {
  const response = await storefrontRequest<{
    product: ShopifyProductNode | null;
  }>(
    `${PRODUCT_FRAGMENT}
    query ProductByHandle($handle: String!) {
      product(handle: $handle) {
        ...StoopingProductFields
      }
    }`,
    { handle }
  );

  return response.product ? mapProduct(response.product) : null;
}

export async function fetchProduct(identifier: {
  id?: string;
  handle?: string;
}): Promise<Product | null> {
  if (identifier.id) {
    return fetchProductById(identifier.id);
  }

  if (identifier.handle) {
    return fetchProductByHandle(identifier.handle);
  }

  throw new Error("fetchProduct requires either an id or handle.");
}

export async function fetchCollections(): Promise<string[]> {
  const { collections } = await fetchCollectionDetails();

  return collections.map((collection) => collection.handle);
}

export async function fetchCollectionDetails(
  cursor: string | null = null,
  pageSize = MAX_COLLECTIONS
): Promise<{
  collections: ShopifyCollection[];
  nextCursor: string | null;
  hasNextPage: boolean;
}> {
  const response = await storefrontRequest<{
    collections: Connection<ShopifyCollection & { image?: ShopifyImage | null }>;
  }>(
    `query Collections($first: Int!, $after: String) {
      collections(first: $first, after: $after, sortKey: TITLE) {
        edges {
          cursor
          node {
            id
            handle
            title
            description
            image {
              url
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
    { first: pageSize, after: cursor }
  );

  return {
    collections: response.collections.edges.map(({ node }) => ({
      id: node.id,
      handle: node.handle,
      title: node.title,
      description: node.description,
      imageUrl: node.image?.url ?? null
    })),
    nextCursor: response.collections.pageInfo?.endCursor ?? null,
    hasNextPage: response.collections.pageInfo?.hasNextPage ?? false
  };
}

export async function fetchCategories(): Promise<string[]> {
  return fetchCollections();
}

export async function cartCreate(
  items: CartItem[],
  customer?: CustomerInfo,
  note?: string
): Promise<CartCreateResult> {
  const validItems = items.filter((item) => {
    const variantId = item.product.variantId?.trim() ?? "";
    return (
      variantId &&
      isShopifyVariantId(variantId) &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
    );
  });
  const invalidItem = items.find((item) => !validItems.includes(item));

  if (items.length === 0) {
    throw new Error("Cannot create a Shopify cart without items.");
  }

  if (invalidItem) {
    throw new ShopifyRequestError(
      `${invalidItem.product.title} cannot be checked out because its Shopify variant is unavailable. Remove it from your order and try again.`,
      { code: "INVALID_CART_LINE" }
    );
  }

  const response = await storefrontRequest<{
    cartCreate: {
      cart: {
        id: string;
        checkoutUrl: string;
      } | null;
      userErrors: ShopifyUserError[];
    };
  }>(
    `mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      input: {
        lines: validItems.map((item) => ({
          merchandiseId: item.product.variantId.trim(),
          quantity: item.quantity,
          attributes: [
            { key: "Product title", value: item.product.title },
            { key: "Product handle", value: item.product.handle }
          ]
        })),
        attributes: buildCartAttributes(customer, note),
        buyerIdentity: customer?.email ? { email: customer.email } : undefined
      }
    }
  );

  const userErrors = response.cartCreate.userErrors;

  if (userErrors.length > 0) {
    throw new ShopifyRequestError(formatShopifyUserErrors(userErrors), {
      code: "SHOPIFY_USER_ERROR",
      userErrors
    });
  }

  const cart = response.cartCreate.cart;

  if (!cart?.checkoutUrl) {
    throw new Error("Shopify did not return a checkout URL.");
  }

  return {
    cartId: cart.id,
    checkoutUrl: cart.checkoutUrl
  };
}

export const createCart = cartCreate;

export async function createShopifyCart({
  customer,
  items,
  note
}: CreateShopifyCartInput): Promise<CartCreateResult> {
  return cartCreate(items, customer, note);
}

function buildCartAttributes(
  customer?: CustomerInfo,
  note?: string
): Array<{ key: string; value: string }> {
  const attributes: Array<{ key: string; value: string }> = [];

  if (customer) {
    attributes.push(
      { key: "Customer name", value: customer.name },
      { key: "Customer phone", value: customer.phone }
    );
  }

  if (note?.trim()) {
    attributes.push({ key: "Order note", value: note.trim() });
  }

  return attributes;
}

function applyClientProductFilters(products: Product[], filters: ProductFilters): Product[] {
  const search = filters.search?.trim().toLowerCase();
  const category = filters.category?.trim().toLowerCase();

  return products.filter((product) => {
    if (filters.inStockOnly && !product.availableForSale) {
      return false;
    }

    if (category) {
      const categoryMatches = [product.category, ...product.tags].some(
        (value) => normalizeHandle(value) === category || value.toLowerCase() === category
      );

      if (!categoryMatches) {
        return false;
      }
    }

    if (!search) return true;

    return [
      product.title,
      product.description,
      product.category,
      ...product.tags
    ].some((value) => value.toLowerCase().includes(search));
  });
}

async function fetchProductsFromStorefront(
  filters: ProductFilters,
  pageSize: number
): Promise<ProductPage> {
  const sort = mapProductSort(filters.sort);
  const query = buildProductQuery(filters);
  const response = await storefrontRequest<{
    products: Connection<ShopifyProductNode>;
  }>(
    `${PRODUCT_FRAGMENT}
    query Products(
      $first: Int!
      $after: String
      $query: String
      $sortKey: ProductSortKeys
      $reverse: Boolean
    ) {
      products(
        first: $first
        after: $after
        query: $query
        sortKey: $sortKey
        reverse: $reverse
      ) {
        edges {
          cursor
          node {
            ...StoopingProductFields
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
    {
      first: pageSize,
      after: filters.cursor ?? null,
      query,
      sortKey: sort.sortKey,
      reverse: sort.reverse
    }
  );

  return connectionToProductPage(response.products);
}

async function fetchProductsByCollection(
  category: string,
  filters: ProductFilters,
  pageSize: number
): Promise<ProductPage> {
  const sort = mapCollectionSort(filters.sort);

  const response = await storefrontRequest<{
    collection: {
      products: Connection<ShopifyProductNode>;
    } | null;
  }>(
    `${PRODUCT_FRAGMENT}
    query CollectionProducts(
      $handle: String!
      $first: Int!
      $after: String
      $sortKey: ProductCollectionSortKeys
      $reverse: Boolean
    ) {
      collection(handle: $handle) {
        products(
          first: $first
          after: $after
          sortKey: $sortKey
          reverse: $reverse
        ) {
          edges {
            cursor
            node {
              ...StoopingProductFields
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }`,
    {
      handle: toHandle(category),
      first: pageSize,
      after: filters.cursor ?? null,
      sortKey: sort.sortKey,
      reverse: sort.reverse
    }
  );

  if (!response.collection) {
    return {
      products: [],
      nextCursor: null,
      hasNextPage: false
    };
  }

  const page = connectionToProductPage(response.collection.products);

  return {
    ...page,
    products: applyClientProductFilters(page.products, filters)
  };
}

async function storefrontRequest<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const endpoint = getStorefrontEndpoint();
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": getStorefrontToken()
      },
      body: JSON.stringify({ query, variables })
    });
  } catch {
    throw new ShopifyRequestError("Could not reach Shopify. Check your connection and try again.", {
      code: "NETWORK_ERROR"
    });
  }

  if (!response.ok) {
    const body = await safeReadResponseText(response);
    const details = [response.statusText, body].filter(Boolean).join(": ");

    throw new ShopifyRequestError(
      `Shopify request failed with status ${response.status}${details ? ` (${details})` : ""}.`,
      { code: "HTTP_ERROR", status: response.status }
    );
  }

  let payload: GraphQLResponse<T>;

  try {
    payload = (await response.json()) as GraphQLResponse<T>;
  } catch {
    throw new ShopifyRequestError("Shopify returned a response the app could not read.", {
      code: "INVALID_JSON",
      status: response.status
    });
  }

  if (payload.errors?.length) {
    throw new ShopifyRequestError(payload.errors.map((error) => error.message).join(" "), {
      code: payload.errors.find((error) => error.extensions?.code)?.extensions?.code ?? "GRAPHQL_ERROR",
      status: response.status
    });
  }

  if (!payload.data) {
    throw new ShopifyRequestError("Shopify response did not include data.", {
      code: "MISSING_DATA",
      status: response.status
    });
  }

  return payload.data;
}

function connectionToProductPage(connection: Connection<ShopifyProductNode>): ProductPage {
  return {
    products: connection.edges.map(({ node }) => mapProduct(node)),
    nextCursor: connection.pageInfo?.endCursor ?? null,
    hasNextPage: connection.pageInfo?.hasNextPage ?? false
  };
}

function mapProduct(product: ShopifyProductNode): Product {
  const tags = Array.isArray(product.tags) ? product.tags : [];
  const variants = product.variants.edges
    .map(({ node }) => normalizeVariant(node))
    .filter((variant): variant is ShopifyVariant => Boolean(variant));
  const variant =
    variants.find((candidate) => isVariantAvailable(candidate)) ??
    variants.find((candidate) => Boolean(candidate.id)) ??
    null;
  const images = uniqueStrings([
    product.featuredImage?.url,
    ...product.images.edges.map(({ node }) => node.url)
  ]);
  const stockCount = resolveStockCount(product, variant);
  const hasCheckoutVariant = Boolean(variant?.id && isShopifyVariantId(variant.id));

  return {
    id: product.id,
    variantId: variant?.id ?? product.id,
    handle: product.handle,
    title: product.title,
    description: product.description ?? "",
    images,
    price: formatMoney(variant?.price),
    estimatedRetailValue: "Not listed",
    condition: resolveCondition(tags),
    stockCount,
    availableForSale: Boolean(
      hasCheckoutVariant &&
        product.availableForSale &&
        variant?.availableForSale &&
        stockCount > 0
    ),
    category: resolveCategory(product),
    tags
  };
}

function resolveStockCount(
  product: ShopifyProductNode,
  variant?: ShopifyVariant | null
): number {
  if (!variant) {
    return 0;
  }

  if (typeof variant?.quantityAvailable === "number") {
    return Math.max(0, variant.quantityAvailable);
  }

  if (typeof product.totalInventory === "number") {
    return Math.max(0, product.totalInventory);
  }

  return product.availableForSale ? 1 : 0;
}

function normalizeVariant(variant: ShopifyVariant): ShopifyVariant | null {
  const id = variant.id?.trim();

  if (!id) {
    return null;
  }

  return {
    ...variant,
    id,
    price: normalizeMoney(variant.price)
  };
}

function normalizeMoney(money?: ShopifyMoney): ShopifyMoney {
  return {
    amount: typeof money?.amount === "string" ? money.amount.trim() : "",
    currencyCode: typeof money?.currencyCode === "string" ? money.currencyCode.trim() : "USD"
  };
}

function isVariantAvailable(variant: ShopifyVariant): boolean {
  if (!variant.availableForSale) {
    return false;
  }

  if (typeof variant.quantityAvailable === "number") {
    return variant.quantityAvailable > 0;
  }

  return true;
}

function resolveCategory(product: ShopifyProductNode): string {
  const tags = Array.isArray(product.tags) ? product.tags : [];
  const tagCategory = tags.find((tag) => isUsefulCategoryLabel(tag));

  if (tagCategory) return tagCategory;

  const collection = product.collections?.edges
    .map(({ node }) => node)
    .find((node) => isUsefulCategoryLabel(node.title));

  if (collection?.title) return collection.title;

  if (product.productType?.trim()) return product.productType.trim();

  return tags[0] ?? "Uncategorized";
}

function resolveCondition(tags: string[]): string {
  const conditionTag = tags.find((tag) => tag.toLowerCase().startsWith("condition:"));

  return conditionTag?.split(":").slice(1).join(":").trim() || "Good used condition";
}

function isUsefulCategoryLabel(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return Boolean(normalized && !normalized.startsWith("condition:") && !SYSTEM_COLLECTION_TITLES.has(normalized));
}

function formatMoney(money?: ShopifyMoney): string {
  if (!money) {
    return "$0.00";
  }

  const amount = Number.parseFloat(money.amount);

  if (!Number.isFinite(amount)) {
    return "$0.00";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: money.currencyCode || "USD"
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  }
}

function buildProductQuery(filters: ProductFilters): string | null {
  const parts: string[] = [];

  if (filters.search?.trim()) {
    parts.push(filters.search.trim());
  }

  if (filters.category?.trim()) {
    const category = quoteSearchValue(filters.category.trim());
    parts.push(`tag:${category}`);
  }

  if (filters.inStockOnly) {
    parts.push("available_for_sale:true");
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

function mapProductSort(sort: ProductSort = "RECENTLY_ADDED"): {
  sortKey: string;
  reverse: boolean;
} {
  switch (sort) {
    case "POPULAR":
      return { sortKey: "BEST_SELLING", reverse: false };
    case "TITLE_ASC":
      return { sortKey: "TITLE", reverse: false };
    case "TITLE_DESC":
      return { sortKey: "TITLE", reverse: true };
    case "EARLIER_LISTINGS":
      return { sortKey: "CREATED_AT", reverse: false };
    case "RECENTLY_ADDED":
    default:
      return { sortKey: "CREATED_AT", reverse: true };
  }
}

function mapCollectionSort(sort: ProductSort = "RECENTLY_ADDED"): {
  sortKey: string;
  reverse: boolean;
} {
  switch (sort) {
    case "POPULAR":
      return { sortKey: "BEST_SELLING", reverse: false };
    case "TITLE_ASC":
      return { sortKey: "TITLE", reverse: false };
    case "TITLE_DESC":
      return { sortKey: "TITLE", reverse: true };
    case "EARLIER_LISTINGS":
      return { sortKey: "CREATED", reverse: false };
    case "RECENTLY_ADDED":
    default:
      return { sortKey: "CREATED", reverse: true };
  }
}

function getStorefrontEndpoint(): string {
  const domain = SHOPIFY_DOMAIN?.trim();

  if (!domain) {
    throw new Error("Missing EXPO_PUBLIC_SHOPIFY_DOMAIN.");
  }

  const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  return `https://${normalizedDomain}/api/${STOREFRONT_API_VERSION}/graphql.json`;
}

function getStorefrontToken(): string {
  const token = STOREFRONT_TOKEN?.trim();

  if (!token) {
    throw new Error("Missing EXPO_PUBLIC_STOREFRONT_TOKEN.");
  }

  return token;
}

function quoteSearchValue(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function toHandle(value: string): string {
  return normalizeHandle(value);
}

function normalizeHandle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

async function cacheProducts(products: Product[]): Promise<void> {
  if (products.length === 0) return;

  await AsyncStorage.setItem(
    PRODUCT_CACHE_KEY,
    JSON.stringify({
      cachedAt: new Date().toISOString(),
      products
    })
  );
}

async function readCachedProducts(): Promise<ProductCachePayload> {
  const cached = await AsyncStorage.getItem(PRODUCT_CACHE_KEY);

  if (!cached) return { cachedAt: null, products: [] };

  try {
    const parsed = JSON.parse(cached) as
      | Product[]
      | { cachedAt?: unknown; products?: Product[] };

    if (Array.isArray(parsed)) {
      return {
        cachedAt: null,
        products: parsed.map(sanitizeCachedProduct)
      };
    }

    return {
      cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : null,
      products: Array.isArray(parsed.products)
        ? parsed.products.map(sanitizeCachedProduct)
        : []
    };
  } catch {
    return { cachedAt: null, products: [] };
  }
}

function sanitizeCachedProduct(product: Product): Product {
  const variantId = product.variantId?.trim() || product.id;
  const hasCheckoutVariant = isShopifyVariantId(variantId);
  const stockCount = Math.max(
    0,
    Number.isFinite(product.stockCount) ? product.stockCount : 0
  );

  return {
    ...product,
    variantId,
    images: uniqueStrings(product.images ?? []),
    stockCount,
    availableForSale: Boolean(
      product.availableForSale && hasCheckoutVariant && stockCount > 0
    )
  };
}

function getCacheAgeMs(cachedAt: string | null): number | undefined {
  if (!cachedAt) return undefined;

  const cachedTime = Date.parse(cachedAt);

  if (!Number.isFinite(cachedTime)) return undefined;

  return Math.max(0, Date.now() - cachedTime);
}

function isShopifyVariantId(value: string): boolean {
  return value.startsWith("gid://shopify/ProductVariant/");
}

function formatShopifyUserErrors(userErrors: ShopifyUserError[]): string {
  return userErrors
    .map((error) => {
      const field = error.field?.filter(Boolean).join(".");
      return field ? `${field}: ${error.message}` : error.message;
    })
    .join(" ");
}

async function safeReadResponseText(response: Response): Promise<string> {
  try {
    return (await response.text()).trim().slice(0, 500);
  } catch {
    return "";
  }
}

function sortCachedProducts(products: Product[], sort: ProductSort = "RECENTLY_ADDED"): Product[] {
  const nextProducts = [...products];

  switch (sort) {
    case "TITLE_ASC":
      return nextProducts.sort((a, b) => a.title.localeCompare(b.title));
    case "TITLE_DESC":
      return nextProducts.sort((a, b) => b.title.localeCompare(a.title));
    default:
      return nextProducts;
  }
}
