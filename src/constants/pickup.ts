import type { PickupConfig } from "../types/order";

export const DEFAULT_PICKUP: PickupConfig = {
  label: "El Cerrito pickup",
  window: "Sunday 2-3 PM",
  address: "Security Public Storage, 1711 Eastshore Blvd, El Cerrito, CA 94530",
  timezone: "America/Los_Angeles"
};

export const PICKUP_SCHEDULE = {
  pickupWeekday: 0,
  pickupStartHour: 14,
  pickupStartMinute: 0,
  pickupEndHour: 15,
  pickupEndMinute: 0,
  confirmationReminderWeekday: 5,
  confirmationReminderHour: 9,
  confirmationReminderMinute: 0,
  pickupReminderHour: 10,
  pickupReminderMinute: 0
} as const;

export const ORDER_LIMIT = 10;
