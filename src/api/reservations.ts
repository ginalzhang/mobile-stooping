declare const process: {
  env: Record<string, string | undefined>;
};

const BASE = process.env.EXPO_PUBLIC_API_URL;
const KEY = process.env.EXPO_PUBLIC_API_KEY;

const headers = {
  "Content-Type": "application/json",
  "x-api-key": KEY ?? ""
};

export type ReserveInput = {
  name: string;
  email: string;
  phone: string;
  pushToken?: string | null;
  items: Array<{
    productId: string;
    variantId: string;
    title: string;
  }>;
};

export type ReservationStatus =
  | "held"
  | "confirmed"
  | "released";

export type Reservation = {
  id: string;
  passCode: string;
  status: ReservationStatus;
  confirmBy: string;
  pickupAt: string;
  items?: Array<{
    productId: string;
    variantId: string;
    title: string;
  }>;
};

export async function createReservation(input: ReserveInput): Promise<Reservation> {
  const response = await fetch(`${getBaseUrl()}/reservations`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(input)
  });

  return readReservationResponse(response, "Could not create your reservation");
}

export async function confirmReservation(id: string): Promise<Reservation> {
  const response = await fetch(`${getBaseUrl()}/reservations/${id}/confirm`, {
    method: "PATCH",
    headers: getHeaders()
  });

  return readReservationResponse(response, "Could not confirm your pickup");
}

export async function releaseReservation(id: string): Promise<Reservation> {
  const response = await fetch(`${getBaseUrl()}/reservations/${id}/release`, {
    method: "PATCH",
    headers: getHeaders()
  });

  return readReservationResponse(response, "Could not release your finds");
}

export async function getReservation(id: string): Promise<Reservation> {
  const response = await fetch(`${getBaseUrl()}/reservations/${id}`, {
    headers: getHeaders()
  });

  return readReservationResponse(response, "Could not load your pickup status");
}

function getBaseUrl(): string {
  const base = BASE?.trim().replace(/\/+$/, "");

  if (!base) {
    throw new Error("Missing EXPO_PUBLIC_API_URL.");
  }

  return base;
}

function getHeaders(): typeof headers {
  if (!KEY?.trim()) {
    throw new Error("Missing EXPO_PUBLIC_API_KEY.");
  }

  return headers;
}

async function readReservationResponse(
  response: Response,
  fallback: string
): Promise<Reservation> {
  const payload = (await response.json().catch(() => ({}))) as
    | Reservation
    | { error?: string };

  if (!response.ok) {
    throw new Error("error" in payload && payload.error ? payload.error : fallback);
  }

  return payload as Reservation;
}
