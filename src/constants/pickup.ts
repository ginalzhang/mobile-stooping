import type { PickupConfig } from "../types/order";

export const DEFAULT_PICKUP: PickupConfig = {
  label: "El Cerrito pickup",
  window: "Sunday 2-3 PM",
  address: "Security Public Storage, 1711 Eastshore Blvd, El Cerrito, CA 94530",
  timezone: "America/Los_Angeles"
};

export const ORDER_LIMIT = 10;
