import cron from "node-cron";

import { q } from "./db.js";
import { sendPush } from "./push.js";

const Z = process.env.TIMEZONE || "America/Los_Angeles";

async function sendFridayConfirmations() {
  const rows = (
    await q(
      `select r.*, count(i.id)::int as n
        from reservations r
        join reservation_items i on i.reservation_id=r.id
       where r.status='held'
         and r.fri_push_at is null
         and r.push_token is not null
       group by r.id`
    )
  ).rows;

  for (const reservation of rows) {
    try {
      await sendPush(reservation.push_token, {
        title: "Confirm your Stooping Club pickup",
        body:
          `Keep your ${reservation.n} reserved find${reservation.n === 1 ? "" : "s"} ` +
          "for Sunday 2-3 PM pickup.",
        data: {
          reservationId: reservation.id,
          reminder: "friday-confirmation"
        }
      });
      await q(
        "update reservations set fri_push_at=now(), updated_at=now() where id=$1",
        [reservation.id]
      );
    } catch (error) {
      console.error(`failed to send Friday push for ${reservation.pass_code}`, error);
    }
  }
}

async function sendSundayReminders() {
  const rows = (
    await q(
      `select * from reservations
        where status='confirmed'
          and sun_push_at is null
          and push_token is not null`
    )
  ).rows;

  for (const reservation of rows) {
    try {
      await sendPush(reservation.push_token, {
        title: "Pickup today",
        body:
          "Pickup is today 2-3 PM at Security Public Storage, 1711 Eastshore Blvd, El Cerrito.",
        data: {
          reservationId: reservation.id,
          reminder: "sunday-pickup"
        }
      });
      await q(
        "update reservations set sun_push_at=now(), updated_at=now() where id=$1",
        [reservation.id]
      );
    } catch (error) {
      console.error(`failed to send Sunday push for ${reservation.pass_code}`, error);
    }
  }
}

export function startJobs() {
  cron.schedule(
    "0 9 * * 5",
    () => {
      sendFridayConfirmations().catch((error) => {
        console.error("Friday push job failed", error);
      });
    },
    { timezone: Z }
  );

  cron.schedule(
    "0 10 * * 0",
    () => {
      sendSundayReminders().catch((error) => {
        console.error("Sunday push job failed", error);
      });
    },
    { timezone: Z }
  );
}
