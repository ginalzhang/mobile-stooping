import type { Product } from "./product";
import type { ReservationStatus } from "../api/reservations";

export type CartItem = {
  product: Product;
  quantity: number;
};

export type CustomerInfo = {
  name: string;
  email: string;
  phone: string;
};

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
  reservation?: {
    id: string;
    passCode: string;
    status: ReservationStatus;
    confirmBy: string;
    pickupAt: string;
  };
};
