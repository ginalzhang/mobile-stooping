import { q, withTransaction } from './db.js';
import { setAvailable } from './shopifyAdmin.js';
import { sendSMS, MSG } from './sms.js';
import { toIso } from './time.js';

export async function reservationItems(reservationId, client = null) {
  const runner = client ?? { query: q };
  const result = await runner.query(
    `select id, product_id, variant_id, inventory_item_id, title
       from reservation_items
      where reservation_id = $1
      order by title asc`,
    [reservationId]
  );
  return result.rows;
}

export async function formatReservation(row, client = null) {
  const items = await reservationItems(row.id, client);
  return {
    id: row.id,
    passCode: row.pass_code,
    status: row.status,
    name: row.name,
    email: row.email,
    phone: row.phone,
    confirmBy: toIso(row.confirm_by),
    pickupAt: toIso(row.pickup_at),
    confirmedAt: toIso(row.confirmed_at),
    pickedUpAt: toIso(row.picked_up_at),
    relistedAt: toIso(row.relisted_at),
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      variantId: item.variant_id,
      title: item.title
    }))
  };
}

export async function getReservationById(id) {
  const result = await q(`select * from reservations where id = $1`, [id]);
  if (!result.rows[0]) return null;
  return formatReservation(result.rows[0]);
}

export async function getReservationByPassCode(passCode) {
  const result = await q(
    `select * from reservations where upper(pass_code) = upper($1)`,
    [passCode]
  );
  if (!result.rows[0]) return null;
  return formatReservation(result.rows[0]);
}

export async function confirmReservation(id) {
  const result = await q(
    `update reservations
        set status = 'confirmed',
            confirmed_at = coalesce(confirmed_at, now())
      where id = $1
        and status = 'held'
      returning *`,
    [id]
  );

  if (result.rows[0]) return formatReservation(result.rows[0]);

  const existing = await getReservationById(id);
  if (!existing) return null;
  return existing;
}

export async function markPickedUp(id) {
  const result = await withTransaction(async (client) => {
    const updated = await client.query(
      `update reservations
          set status = 'picked_up',
              picked_up_at = coalesce(picked_up_at, now())
        where id = $1
          and status = 'confirmed'
        returning *`,
      [id]
    );
    if (!updated.rows[0]) return null;
    await client.query(`delete from active_variant_holds where reservation_id = $1`, [id]);
    return updated;
  });

  if (result?.rows[0]) return formatReservation(result.rows[0]);
  return getReservationById(id);
}

export async function releaseReservation(id) {
  return relistReservationById(id, 'released', false);
}

export async function relistReservationById(id, status = 'relisted', notify = true) {
  const result = await q(
    `select * from reservations
      where id = $1
        and status in ('held', 'confirmed')
      for update`,
    [id]
  );
  const reservation = result.rows[0];
  if (!reservation) return getReservationById(id);

  return relistReservationRow(reservation, status, notify);
}

export async function relistReservationRow(reservation, status = 'relisted', notify = true) {
  const formatted = await withTransaction(async (client) => {
    const current = await client.query(
      `select * from reservations
        where id = $1
          and status in ('held', 'confirmed')
        for update`,
      [reservation.id]
    );
    const active = current.rows[0];
    if (!active) return null;

    const items = await reservationItems(active.id, client);
    for (const item of items) {
      await setAvailable(item.inventory_item_id, 1);
    }

    const next = await client.query(
      `update reservations
          set status = $2,
              relisted_at = now()
        where id = $1
        returning *`,
      [active.id, status]
    );
    await client.query(`delete from active_variant_holds where reservation_id = $1`, [active.id]);

    return { reservation: next.rows[0], items };
  });

  if (!formatted) return getReservationById(reservation.id);

  if (notify && formatted.reservation.status === 'relisted') {
    try {
      await sendSMS(formatted.reservation.phone, MSG.relisted(formatted.reservation, formatted.items.length));
    } catch (error) {
      console.warn(`Could not send relist SMS for ${formatted.reservation.pass_code}: ${error.message}`);
    }
  }

  return formatReservation(formatted.reservation);
}

export async function assertVariantsNotActivelyHeld(variantIds, client) {
  const result = await client.query(
    `select variant_id
       from active_variant_holds
      where variant_id = any($1::text[])
      for update`,
    [variantIds]
  );

  if (result.rows.length) {
    const held = result.rows.map((row) => row.variant_id).join(', ');
    throw Object.assign(new Error('One or more finds were just claimed.'), {
      statusCode: 409,
      code: 'already_held',
      detail: held
    });
  }
}
