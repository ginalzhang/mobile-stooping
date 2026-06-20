import { DateTime } from 'luxon';

export const ZONE = process.env.TIMEZONE || 'America/Los_Angeles';

function nextWeekdayAt(weekday, hour) {
  const now = DateTime.now().setZone(ZONE);
  let date = now.set({ hour, minute: 0, second: 0, millisecond: 0 });

  while (date.weekday !== weekday || date <= now) {
    date = date.plus({ days: 1 });
  }

  return date.toUTC().toJSDate();
}

export const nextFriday17 = () => nextWeekdayAt(5, 17);
export const nextSunday14 = () => nextWeekdayAt(7, 14);

export function toIso(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}
