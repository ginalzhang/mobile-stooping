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

type ShopifyMetafield = {
  value: string;
  type?: string;
} | null | undefined;

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
  estimatedRetailValue?: ShopifyMetafield;
  estimatedRetail?: ShopifyMetafield;
  retailValue?: ShopifyMetafield;
  condition?: ShopifyMetafield;
  itemCondition?: ShopifyMetafield;
  stockCount?: ShopifyMetafield;
  quantity?: ShopifyMetafield;
  category?: ShopifyMetafield;
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
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

type ShopifyUserError = {
  field?: string[] | null;
  message: string;
};

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
    estimatedRetailValue: metafield(namespace: "custom", key: "estimated_retail_value") {
      value
      type
    }
    estimatedRetail: metafield(namespace: "custom", key: "estimated_retail") {
      value
      type
    }
    retailValue: metafield(namespace: "custom", key: "retail_value") {
      value
      type
    }
    condition: metafield(namespace: "custom", key: "condition") {
      value
      type
    }
    itemCondition: metafield(namespace: "custom", key: "item_condition") {
      value
      type
    }
    stockCount: metafield(namespace: "custom", key: "stock_count") {
      value
      type
    }
    quantity: metafield(namespace: "custom", key: "quantity") {
      value
      type
    }
    category: metafield(namespace: "custom", key: "category") {
      value
      type
    }
  }
`;

export async function fetchProducts(
  filters: ProductFilters = {},
  pageSize = DEFAULT_PAGE_SIZE
): Promise<ProductPage> {
  if (filters.category) {
    return fetchProductsByCollection(filters.category, filters, pageSize);
  }

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
  if (items.length === 0) {
    throw new Error("Cannot create a Shopify cart without items.");
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
        lines: items.map((item) => ({
          merchandiseId: item.product.variantId,
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
    throw new Error(userErrors.map((error) => error.message).join(" "));
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

  return products.filter((product) => {
    if (filters.inStockOnly && !product.availableForSale) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [
      product.title,
      product.description,
      product.category,
      ...product.tags
    ].some((value) => value.toLowerCase().includes(search));
  });
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
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": getStorefrontToken()
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`Shopify request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GraphQLResponse<T>;

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(" "));
  }

  if (!payload.data) {
    throw new Error("Shopify response did not include data.");
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
  const variants = product.variants.edges.map(({ node }) => node);
  const firstAvailableVariant = variants.find((variant) => variant.availableForSale);
  const variant = firstAvailableVariant ?? variants[0];
  const images = uniqueStrings([
    product.featuredImage?.url,
    ...product.images.edges.map(({ node }) => node.url)
  ]);
  const stockCount = resolveStockCount(product, variant);

  return {
    id: product.id,
    variantId: variant?.id ?? "",
    handle: product.handle,
    title: product.title,
    description: product.description ?? "",
    images,
    price: formatMoney(variant?.price),
    estimatedRetailValue: resolveMetafieldValue(
      product.estimatedRetailValue,
      product.estimatedRetail,
      product.retailValue
    ),
    condition: resolveMetafieldValue(product.condition, product.itemCondition) || "Unknown",
    stockCount,
    availableForSale: Boolean(product.availableForSale && variant?.availableForSale && stockCount > 0),
    category: resolveCategory(product),
    tags: product.tags ?? []
  };
}

function resolveStockCount(product: ShopifyProductNode, variant?: ShopifyVariant): number {
  const metafieldCount = parseOptionalNumber(
    resolveMetafieldValue(product.stockCount, product.quantity)
  );

  if (metafieldCount !== null) {
    return Math.max(0, metafieldCount);
  }

  if (typeof variant?.quantityAvailable === "number") {
    return Math.max(0, variant.quantityAvailable);
  }

  if (typeof product.totalInventory === "number") {
    return Math.max(0, product.totalInventory);
  }

  return product.availableForSale ? 1 : 0;
}

function resolveCategory(product: ShopifyProductNode): string {
  const metafieldCategory = resolveMetafieldValue(product.category);

  if (metafieldCategory) {
    return metafieldCategory;
  }

  if (product.productType) {
    return product.productType;
  }

  const collection = product.collections?.edges[0]?.node;

  if (collection?.title) {
    return collection.title;
  }

  return product.tags[0] ?? "Uncategorized";
}

function resolveMetafieldValue(...metafields: ShopifyMetafield[]): string {
  const metafield = metafields.find((field) => field?.value);

  return metafield?.value?.trim() ?? "";
}

function formatMoney(money?: ShopifyMoney): string {
  if (!money) {
    return "$0.00";
  }

  const amount = Number.parseFloat(money.amount);

  if (!Number.isFinite(amount)) {
    return money.amount;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currencyCode || "USD"
  }).format(amount);
}

function parseOptionalNumber(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function buildProductQuery(filters: ProductFilters): string | null {
  const parts: string[] = [];

  if (filters.search?.trim()) {
    parts.push(filters.search.trim());
  }

  if (filters.category?.trim()) {
    const category = quoteSearchValue(filters.category.trim());
    parts.push(`product_type:${category}`);
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
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}
