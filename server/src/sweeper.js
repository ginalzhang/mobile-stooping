import cron from 'node-cron';

import { q } from './db.js';
import { relistReservationRow } from './reservations.js';
import { sendSMS, MSG } from './sms.js';

const ZONE = process.env.TIMEZONE || 'America/Los_Angeles';
const GRACE_HOURS = Number(process.env.RELIST_GRACE_HOURS || 19);

async function relist(reservation, reason) {
  const relisted = await relistReservationRow(reservation, 'relisted', true);
  console.log(`relisted ${relisted?.passCode ?? reservation.pass_code} (${reason})`);
}

export async function sweepExpiredReservations() {
  const expired = await q(
    `select *
       from reservations
      where status = 'held'
        and confirm_by < now()`
  );

  for (const reservation of expired.rows) {
    await relist(reservation, 'no-confirm');
  }

  const noShows = await q(
    `select *
       from reservations
      where status = 'confirmed'
        and pickup_at + ($1 || ' hours')::interval < now()`,
    [GRACE_HOURS]
  );

  for (const reservation of noShows.rows) {
    await relist(reservation, 'no-show');
  }
}

export async function sendFridayConfirmTexts() {
  const rows = await q(
    `select r.*, count(i.id)::int as item_count
       from reservations r
       join reservation_items i on i.reservation_id = r.id
      where r.status = 'held'
        and r.fri_sms_at is null
      group by r.id`
  );

  for (const reservation of rows.rows) {
    try {
      await sendSMS(reservation.phone, MSG.fridayConfirm(reservation, reservation.item_count));
    } catch (error) {
      console.warn(`Could not send Friday SMS for ${reservation.pass_code}: ${error.message}`);
      continue;
    }
    await q(`update reservations set fri_sms_at = now() where id = $1`, [reservation.id]);
  }
}

export async function sendSundayPickupTexts() {
  const rows = await q(
    `select *
       from reservations
      where status = 'confirmed'
        and sun_sms_at is null`
  );

  for (const reservation of rows.rows) {
    try {
      await sendSMS(reservation.phone, MSG.sundayReminder(reservation));
    } catch (error) {
      console.warn(`Could not send Sunday SMS for ${reservation.pass_code}: ${error.message}`);
      continue;
    }
    await q(`update reservations set sun_sms_at = now() where id = $1`, [reservation.id]);
  }
}

export function startJobs() {
  cron.schedule('*/10 * * * *', () => {
    sweepExpiredReservations().catch((error) => {
      console.error('reservation sweep failed', error);
    });
  });

  cron.schedule('0 9 * * 5', () => {
    sendFridayConfirmTexts().catch((error) => {
      console.error('Friday SMS job failed', error);
    });
  }, { timezone: ZONE });

  cron.schedule('0 10 * * 0', () => {
    sendSundayPickupTexts().catch((error) => {
      console.error('Sunday SMS job failed', error);
    });
  }, { timezone: ZONE });
}
