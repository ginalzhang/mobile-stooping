import { DateTime } from "luxon";

const Z = process.env.TIMEZONE || "America/Los_Angeles";

function next(weekday, hour) {
  let d = DateTime.now()
    .setZone(Z)
    .set({ hour, minute: 0, second: 0, millisecond: 0 });

  while (d.weekday !== weekday || d <= DateTime.now().setZone(Z)) {
    d = d.plus({ days: 1 });
  }

  return d.toJSDate();
}

export const nextFriday17 = () => next(5, 17);
export const nextSunday14 = () => next(7, 14);
