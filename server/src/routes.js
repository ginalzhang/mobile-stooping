import express from "express";
import { customAlphabet } from "nanoid";

import { q, tx } from "./db.js";
import { nextFriday17, nextSunday14 } from "./time.js";

const router = express.Router();
const codeId = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 4);

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.post("/reservations", requireAppKey, async (req, res) => {
  const input = normalizeReservationInput(req.body);

  if (!input.ok) {
    res.status(400).json({ error: input.error });
    return;
  }

  try {
    const reservation = await tx(async (client) => {
      const passCode = await createUniquePassCode(client);
      const inserted = await client.query(
        `insert into reservations
          (pass_code, name, email, phone, push_token, confirm_by, pickup_at)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning *`,
        [
          passCode,
          input.value.name,
          input.value.email,
          input.value.phone,
          input.value.pushToken,
          nextFriday17(),
          nextSunday14()
        ]
      );
      const reservation = inserted.rows[0];

      for (const item of input.value.items) {
        await client.query(
          `insert into reservation_items
            (reservation_id, product_id, variant_id, title)
           values ($1, $2, $3, $4)`,
          [reservation.id, item.productId, item.variantId, item.title]
        );
      }

      return reservation;
    });

    res.status(201).json(toReservationDTO(reservation));
  } catch (error) {
    sendError(res, error, "Could not create your reservation.");
  }
});

router.get("/reservations/:id", requireAppKey, async (req, res) => {
  const reservation = await findReservation(req.params.id);

  if (!reservation) {
    res.status(404).json({ error: "Reservation not found." });
    return;
  }

  res.json(await toReservationWithItemsDTO(reservation));
});

router.patch("/reservations/:id/confirm", requireAppKey, async (req, res) => {
  const result = await q(
    `update reservations
        set status='confirmed', confirmed_at=coalesce(confirmed_at, now()), updated_at=now()
      where id=$1 and status='held'
      returning *`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    const current = await findReservation(req.params.id);
    if (!current) {
      res.status(404).json({ error: "Reservation not found." });
      return;
    }

    res.json(toReservationDTO(current));
    return;
  }

  res.json(toReservationDTO(result.rows[0]));
});

router.patch("/reservations/:id/release", requireAppKey, async (req, res) => {
  const result = await q(
    `update reservations
        set status='released', released_at=coalesce(released_at, now()), updated_at=now()
      where id=$1 and status in ('held','confirmed')
      returning *`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    const current = await findReservation(req.params.id);
    if (!current) {
      res.status(404).json({ error: "Reservation not found." });
      return;
    }

    res.json(toReservationDTO(current));
    return;
  }

  res.json(toReservationDTO(result.rows[0]));
});

function requireAppKey(req, res, next) {
  if (!process.env.APP_API_KEY || req.get("x-api-key") !== process.env.APP_API_KEY) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  next();
}

function normalizeReservationInput(body) {
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const phone = normalizePhone(String(body?.phone ?? ""));
  const pushToken = normalizeOptionalString(body?.pushToken);
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!name) return { ok: false, error: "Name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "A valid email is required." };
  }
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    return { ok: false, error: "Phone must be in E.164 format." };
  }
  if (items.length === 0) return { ok: false, error: "At least one item is required." };
  if (items.length > 10) return { ok: false, error: "Reservations are limited to 10 items." };

  const normalizedItems = [];
  const variantIds = new Set();

  for (const item of items) {
    const productId = String(item?.productId ?? "").trim();
    const variantId = String(item?.variantId ?? "").trim();
    const title = String(item?.title ?? "").trim();

    if (!productId || !variantId || !title) {
      return { ok: false, error: "Each item needs productId, variantId, and title." };
    }

    if (variantIds.has(variantId)) {
      return { ok: false, error: "Each find can only be reserved once." };
    }

    variantIds.add(variantId);
    normalizedItems.push({ productId, variantId, title });
  }

  return {
    ok: true,
    value: {
      name,
      email,
      phone,
      pushToken,
      items: normalizedItems
    }
  };
}

function normalizePhone(value) {
  return value.replace(/[^\d+]/g, "");
}

function normalizeOptionalString(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

async function createUniquePassCode(client) {
  for (let attempts = 0; attempts < 10; attempts += 1) {
    const passCode = `STOOP-${codeId()}`;
    const existing = await client.query("select 1 from reservations where pass_code=$1", [
      passCode
    ]);

    if (existing.rowCount === 0) {
      return passCode;
    }
  }

  throw new Error("Could not create a reservation code.");
}

async function findReservation(id) {
  const result = await q("select * from reservations where id=$1", [id]);
  return result.rows[0] ?? null;
}

async function toReservationWithItemsDTO(reservation) {
  const items = (
    await q(
      `select product_id, variant_id, title
         from reservation_items
        where reservation_id=$1
        order by title`,
      [reservation.id]
    )
  ).rows;

  return {
    ...toReservationDTO(reservation),
    name: reservation.name,
    items: items.map((item) => ({
      productId: item.product_id,
      variantId: item.variant_id,
      title: item.title
    }))
  };
}

function toReservationDTO(reservation) {
  return {
    id: reservation.id,
    passCode: reservation.pass_code,
    status: reservation.status,
    confirmBy: reservation.confirm_by?.toISOString?.() ?? reservation.confirm_by,
    pickupAt: reservation.pickup_at?.toISOString?.() ?? reservation.pickup_at
  };
}

function sendError(res, error, fallback) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const message = error instanceof Error ? error.message : fallback;
  res.status(status).json({ error: message || fallback });
}

export default router;
