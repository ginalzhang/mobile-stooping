import express from 'express';
import { customAlphabet } from 'nanoid';
import twilio from 'twilio';

import { q, withTransaction } from './db.js';
import { inventoryItemIdForVariant, setAvailable, listLocations } from './shopifyAdmin.js';
import { MSG } from './sms.js';
import { nextFriday17, nextSunday14 } from './time.js';
import {
  assertVariantsNotActivelyHeld,
  confirmReservation,
  formatReservation,
  getReservationById,
  getReservationByPassCode,
  markPickedUp,
  releaseReservation
} from './reservations.js';

const router = express.Router();
const passDigits = customAlphabet('0123456789ABCDEFGHJKLMNPQRSTUVWXYZ', 4);

function requireAppKey(req, res, next) {
  if (!process.env.APP_API_KEY || req.get('x-api-key') !== process.env.APP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

function requireStaffKey(req, res, next) {
  if (!process.env.STAFF_API_KEY || req.get('x-staff-api-key') !== process.env.STAFF_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

function validateTwilio(req, res, next) {
  const signature = req.get('x-twilio-signature');
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const publicUrl = process.env.PUBLIC_URL;

  if (!signature || !authToken || !publicUrl) {
    return res.status(401).send('Unauthorized');
  }

  const url = `${publicUrl.replace(/\/+$/, '')}${req.originalUrl}`;
  const ok = twilio.validateRequest(authToken, signature, url, req.body);
  if (!ok) return res.status(401).send('Unauthorized');
  return next();
}

function normalizePhone(value) {
  const phone = String(value ?? '').trim();
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw Object.assign(new Error('Phone must be E.164, like +15105550162.'), {
      statusCode: 400
    });
  }
  return phone;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('Add at least 1 find.'), { statusCode: 400 });
  }

  return items.map((item) => {
    const productId = String(item.productId ?? '').trim();
    const variantId = String(item.variantId ?? '').trim();
    const title = String(item.title ?? '').trim();
    if (!productId || !variantId || !title) {
      throw Object.assign(new Error('Each item needs productId, variantId, and title.'), {
        statusCode: 400
      });
    }
    return { productId, variantId, title };
  });
}

async function createPassCode(client) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const passCode = `STOOP-${passDigits()}`;
    const existing = await client.query(
      `select 1 from reservations where pass_code = $1`,
      [passCode]
    );
    if (!existing.rows.length) return passCode;
  }
  throw new Error('Could not create pass code.');
}

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

router.get('/admin/locations', requireStaffKey, asyncHandler(async (_req, res) => {
  res.json({ locations: await listLocations() });
}));

router.post('/reservations', requireAppKey, asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const email = String(req.body.email ?? '').trim();
  const phone = normalizePhone(req.body.phone);
  const items = normalizeItems(req.body.items);

  if (!name || !email.includes('@')) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const heldInventoryIds = [];

  try {
    const reservation = await withTransaction(async (client) => {
      await assertVariantsNotActivelyHeld(items.map((item) => item.variantId), client);

      const enrichedItems = [];
      for (const item of items) {
        const inventoryItemId = await inventoryItemIdForVariant(item.variantId);
        enrichedItems.push({ ...item, inventoryItemId });
      }

      const passCode = await createPassCode(client);
      const inserted = await client.query(
        `insert into reservations
          (pass_code, status, name, email, phone, confirm_by, pickup_at)
         values ($1, 'held', $2, $3, $4, $5, $6)
         returning *`,
        [passCode, name, email, phone, nextFriday17(), nextSunday14()]
      );
      const row = inserted.rows[0];

      for (const item of enrichedItems) {
        await client.query(
          `insert into reservation_items
            (reservation_id, product_id, variant_id, inventory_item_id, title)
           values ($1, $2, $3, $4, $5)`,
          [row.id, item.productId, item.variantId, item.inventoryItemId, item.title]
        );
        await client.query(
          `insert into active_variant_holds (variant_id, reservation_id)
           values ($1, $2)`,
          [item.variantId, row.id]
        );
      }

      for (const item of enrichedItems) {
        await setAvailable(item.inventoryItemId, 0);
        heldInventoryIds.push(item.inventoryItemId);
      }

      return formatReservation(row, client);
    });

    res.status(201).json(reservation);
  } catch (error) {
    await Promise.allSettled(heldInventoryIds.map((inventoryItemId) => setAvailable(inventoryItemId, 1)));
    throw error;
  }
}));

router.get('/reservations/:id', requireAppKey, asyncHandler(async (req, res) => {
  const reservation = await getReservationById(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
  return res.json(reservation);
}));

router.patch('/reservations/:id/confirm', requireAppKey, asyncHandler(async (req, res) => {
  const reservation = await confirmReservation(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
  return res.json(reservation);
}));

router.patch('/reservations/:id/release', requireAppKey, asyncHandler(async (req, res) => {
  const reservation = await releaseReservation(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
  return res.json(reservation);
}));

router.get('/reservations/by-code/:passCode', requireStaffKey, asyncHandler(async (req, res) => {
  const reservation = await getReservationByPassCode(req.params.passCode);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
  return res.json(reservation);
}));

router.post('/reservations/:id/pickup', requireStaffKey, asyncHandler(async (req, res) => {
  const reservation = await markPickedUp(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
  return res.json(reservation);
}));

router.post('/reservations/:id/staff-release', requireStaffKey, asyncHandler(async (req, res) => {
  const reservation = await releaseReservation(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
  return res.json(reservation);
}));

router.post('/pickup', requireStaffKey, asyncHandler(async (req, res) => {
  const passCode = String(req.body.passCode ?? '').trim();
  if (!passCode) return res.status(400).json({ error: 'passCode is required.' });

  const reservation = await getReservationByPassCode(passCode);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
  const pickedUp = await markPickedUp(reservation.id);
  return res.json(pickedUp);
}));

router.post('/sms/inbound', validateTwilio, asyncHandler(async (req, res) => {
  const from = normalizePhone(req.body.From);
  const body = String(req.body.Body ?? '');
  const twiml = new twilio.twiml.MessagingResponse();

  if (/^\s*y(es)?\b/i.test(body)) {
    const result = await q(
      `select *
         from reservations
        where phone = $1
          and status = 'held'
        order by created_at desc
        limit 1`,
      [from]
    );
    const reservation = result.rows[0];
    if (reservation) {
      const confirmed = await confirmReservation(reservation.id);
      twiml.message(MSG.confirmAck({ pass_code: confirmed.passCode }));
    }
  }

  res.type('text/xml').send(twiml.toString());
}));

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(error, _req, res, _next) {
  if (error.code === '23505') {
    return res.status(409).json({
      error: 'One or more finds were just claimed.',
      code: 'already_held'
    });
  }

  const status = error.statusCode || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: error.message || 'Server error',
    code: error.code
  });
}

export default router;
