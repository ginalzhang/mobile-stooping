const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

export type ReservationStatus =
  | "held"
  | "confirmed"
  | "picked_up"
  | "relisted"
  | "released";

export type ReserveInput = {
  name: string;
  email: string;
  phone: string;
  items: {
    productId: string;
    variantId: string;
    title: string;
  }[];
};

export type Reservation = {
  id: string;
  passCode: string;
  status: ReservationStatus;
  name?: string;
  email?: string;
  phone?: string;
  confirmBy: string;
  pickupAt: string;
  confirmedAt?: string | null;
  pickedUpAt?: string | null;
  relistedAt?: string | null;
  items?: {
    id: string;
    productId: string;
    variantId: string;
    title: string;
  }[];
};

export async function createReservation(input: ReserveInput): Promise<Reservation> {
  return reservationRequest("/reservations", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getReservation(id: string): Promise<Reservation> {
  return reservationRequest(`/reservations/${id}`);
}

export async function confirmReservation(id: string): Promise<Reservation> {
  return reservationRequest(`/reservations/${id}/confirm`, { method: "PATCH" });
}

export async function releaseReservation(id: string): Promise<Reservation> {
  return reservationRequest(`/reservations/${id}/release`, { method: "PATCH" });
}

async function reservationRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!API_URL || !API_KEY) {
    throw new Error("Reservation server is not configured.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...init.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Reservation request failed.");
  }

  return response.json() as Promise<T>;
}
