export type Product = {
  id: string;
  variantId: string;
  handle: string;
  title: string;
  description: string;
  images: string[];
  price: string;
  estimatedRetailValue: string;
  condition: string;
  stockCount: number;
  availableForSale: boolean;
  category: string;
  tags: string[];
};

export type ProductSort =
  | "RECENTLY_ADDED"
  | "POPULAR"
  | "TITLE_ASC"
  | "TITLE_DESC"
  | "EARLIER_LISTINGS";

export type ProductFilters = {
  search?: string;
  category?: string;
  inStockOnly?: boolean;
  sort?: ProductSort;
  cursor?: string | null;
};

export type ProductPage = {
  products: Product[];
  nextCursor: string | null;
  hasNextPage: boolean;
};
