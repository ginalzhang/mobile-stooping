import type { Product } from "./product";

export type CartItem = {
  product: Product;
  quantity: number;
};

export type CustomerInfo = {
  name: string;
  email: string;
  phone: string;
};

export type ContactFormErrors = Partial<Record<keyof CustomerInfo, string>>;

export type PickupConfig = {
  label: string;
  window: string;
  address: string;
  timezone: string;
};

export type OrderConfirmation = {
  checkoutUrl?: string;
  customer: CustomerInfo;
  items: CartItem[];
  confirmedAt: string;
};
