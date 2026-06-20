import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import { DEFAULT_PICKUP, PICKUP_SCHEDULE } from "../../constants/pickup";
import type { OrderConfirmation } from "../../types/order";

export const STOOPING_NOTIFICATION_CHANNEL_ID = "stooping-pickup-reminders";

export const STOOPING_NOTIFICATION_IDS = {
  confirmation: "stooping-order-confirmation-reminder",
  pickup: "stooping-order-pickup-reminder"
} as const;

export const NOTIFICATION_TIMEZONE = DEFAULT_PICKUP.timezone;

export const NOTIFICATION_COPY = {
  timezoneLabel: "America/Los_Angeles",
  permissionTitle: "Pickup reminders",
  permissionBody:
    "Schedule reminders for a specific Stooping Club pickup after checkout is started.",
  fridayTitle: "Confirm your Stooping Club pickup",
  fridayBody: `Pickup is ${DEFAULT_PICKUP.window} at ${DEFAULT_PICKUP.address}. Times are in ${DEFAULT_PICKUP.timezone}.`,
  sundayTitle: "Pickup today",
  sundayBody: `${DEFAULT_PICKUP.label} is ${DEFAULT_PICKUP.window} at ${DEFAULT_PICKUP.address}. Times are in ${DEFAULT_PICKUP.timezone}.`,
  deniedFallback:
    `Notifications are off. You can still pick up ${DEFAULT_PICKUP.window} at ${DEFAULT_PICKUP.address}, or enable notifications in system settings.`,
  unavailableFallback:
    `We could not schedule reminders on this device. Pickup is still ${DEFAULT_PICKUP.window} at ${DEFAULT_PICKUP.address}.`
} as const;

export type NotificationPermissionState =
  | "granted"
  | "denied"
  | "undetermined"
  | "unavailable";

export type ReminderScheduleResult = {
  status: "scheduled" | "denied" | "unavailable";
  permissionState: NotificationPermissionState;
  notificationIds?: typeof STOOPING_NOTIFICATION_IDS;
  schedule?: PickupReminderSchedule;
  message: string;
};

export type ReminderOrderDetails = {
  orderCode: string;
  customerName: string;
  itemCount: number;
  itemSummary: string;
  confirmedAt: string;
};

export type PickupReminderSchedule = {
  confirmationReminderAt?: string;
  pickupReminderAt?: string;
  pickupStartsAt: string;
  pickupEndsAt: string;
};

export type ReminderDisplayRow = {
  label: string;
  detail: string;
  past?: boolean;
};

export function installStoopingNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  try {
    const permissions = await Notifications.getPermissionsAsync();

    if (permissions.granted) {
      return "granted";
    }

    return permissions.status === "denied" ? "denied" : "undetermined";
  } catch {
    return "unavailable";
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  try {
    const current = await Notifications.getPermissionsAsync();

    if (current.granted) {
      return "granted";
    }

    if (current.status === "denied" && !current.canAskAgain) {
      return "denied";
    }

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true
      }
    });

    if (requested.granted) {
      return "granted";
    }

    return requested.status === "denied" ? "denied" : "undetermined";
  } catch {
    return "unavailable";
  }
}

export async function cancelStoopingReminderNotifications(): Promise<void> {
  await Promise.all(
    Object.values(STOOPING_NOTIFICATION_IDS).map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier)
    )
  );
}

export async function scheduleStoopingReminderNotifications(
  order?: ReminderOrderDetails
): Promise<ReminderScheduleResult> {
  if (!order) {
    return {
      status: "unavailable",
      permissionState: await getNotificationPermissionState(),
      message: "Start checkout first, then schedule reminders from your pickup pass."
    };
  }

  const schedule = getPickupReminderSchedule(order.confirmedAt);
  const reminderDates = [
    schedule.confirmationReminderAt
      ? {
          id: STOOPING_NOTIFICATION_IDS.confirmation,
          date: new Date(schedule.confirmationReminderAt),
          title: NOTIFICATION_COPY.fridayTitle,
          body: `${order.customerName || "Your order"}: ${order.itemSummary}. Pickup is ${formatReminderDate(schedule.pickupStartsAt)} at ${DEFAULT_PICKUP.address}.`
        }
      : null,
    schedule.pickupReminderAt
      ? {
          id: STOOPING_NOTIFICATION_IDS.pickup,
          date: new Date(schedule.pickupReminderAt),
          title: NOTIFICATION_COPY.sundayTitle,
          body: `${order.itemCount} ${order.itemCount === 1 ? "item" : "items"} for ${order.customerName || "pickup"} today, ${DEFAULT_PICKUP.window}. Code ${order.orderCode}.`
        }
      : null
  ].filter((reminder): reminder is NonNullable<typeof reminder> => {
    return Boolean(reminder && reminder.date.getTime() > Date.now());
  });

  if (!reminderDates.length) {
    return {
      status: "unavailable",
      permissionState: await getNotificationPermissionState(),
      schedule,
      message: `This order has no upcoming reminder times. Pickup was ${formatReminderDate(schedule.pickupStartsAt)}.`
    };
  }

  const permissionState = await requestNotificationPermission();

  if (permissionState !== "granted") {
    return {
      status: permissionState === "unavailable" ? "unavailable" : "denied",
      permissionState,
      schedule,
      message:
        permissionState === "unavailable"
          ? NOTIFICATION_COPY.unavailableFallback
          : NOTIFICATION_COPY.deniedFallback
    };
  }

  try {
    await ensureNotificationChannel();
    await cancelStoopingReminderNotifications();

    await Promise.all(
      reminderDates.map((reminder) =>
        Notifications.scheduleNotificationAsync({
          identifier: reminder.id,
          content: {
            title: reminder.title,
            body: reminder.body,
            data: {
              orderCode: order.orderCode,
              pickupStartsAt: schedule.pickupStartsAt,
              pickupWindow: DEFAULT_PICKUP.window,
              reminderId: reminder.id,
              timezone: NOTIFICATION_TIMEZONE
            },
            sound: "default"
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminder.date,
            channelId: STOOPING_NOTIFICATION_CHANNEL_ID
          }
        })
      )
    );

    return {
      status: "scheduled",
      permissionState,
      notificationIds: STOOPING_NOTIFICATION_IDS,
      schedule,
      message: `Reminders are on for ${formatReminderSummary(schedule)}.`
    };
  } catch {
    return {
      status: "unavailable",
      permissionState: "unavailable",
      schedule,
      message: NOTIFICATION_COPY.unavailableFallback
    };
  }
}

export function buildReminderOrderDetails(
  confirmation: OrderConfirmation,
  orderCode: string
): ReminderOrderDetails {
  const itemCount = confirmation.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    orderCode,
    customerName: confirmation.customer.name,
    itemCount,
    itemSummary: summarizeItems(confirmation),
    confirmedAt: confirmation.confirmedAt
  };
}

export function getPickupReminderSchedule(
  confirmedAt: string,
  now = new Date()
): PickupReminderSchedule {
  const base = parseDateOrNow(confirmedAt);
  const pickupStart = nextZonedWeekdayDate(
    base,
    PICKUP_SCHEDULE.pickupWeekday,
    PICKUP_SCHEDULE.pickupStartHour,
    PICKUP_SCHEDULE.pickupStartMinute,
    DEFAULT_PICKUP.timezone
  );
  const pickupEnd = makeDateInTimeZone(
    getZonedParts(pickupStart, DEFAULT_PICKUP.timezone).year,
    getZonedParts(pickupStart, DEFAULT_PICKUP.timezone).month - 1,
    getZonedParts(pickupStart, DEFAULT_PICKUP.timezone).day,
    PICKUP_SCHEDULE.pickupEndHour,
    PICKUP_SCHEDULE.pickupEndMinute,
    DEFAULT_PICKUP.timezone
  );
  const pickupParts = getZonedParts(pickupStart, DEFAULT_PICKUP.timezone);
  const confirmationReminder = dateForWeekdayBefore(
    pickupParts,
    PICKUP_SCHEDULE.confirmationReminderWeekday,
    PICKUP_SCHEDULE.confirmationReminderHour,
    PICKUP_SCHEDULE.confirmationReminderMinute,
    DEFAULT_PICKUP.timezone
  );
  const pickupReminder = makeDateInTimeZone(
    pickupParts.year,
    pickupParts.month - 1,
    pickupParts.day,
    PICKUP_SCHEDULE.pickupReminderHour,
    PICKUP_SCHEDULE.pickupReminderMinute,
    DEFAULT_PICKUP.timezone
  );

  return {
    confirmationReminderAt:
      confirmationReminder.getTime() > now.getTime()
        ? confirmationReminder.toISOString()
        : undefined,
    pickupReminderAt:
      pickupReminder.getTime() > now.getTime() ? pickupReminder.toISOString() : undefined,
    pickupStartsAt: pickupStart.toISOString(),
    pickupEndsAt: pickupEnd.toISOString()
  };
}

export function getReminderDisplayRows(
  schedule: PickupReminderSchedule,
  now = new Date()
): ReminderDisplayRow[] {
  return [
    {
      label: "Checkout",
      detail: schedule.confirmationReminderAt
        ? formatReminderDate(schedule.confirmationReminderAt)
        : "No upcoming confirmation reminder for this order",
      past: !schedule.confirmationReminderAt
    },
    {
      label: "Pickup",
      detail: schedule.pickupReminderAt
        ? formatReminderDate(schedule.pickupReminderAt)
        : new Date(schedule.pickupStartsAt).getTime() > now.getTime()
          ? "Pickup reminder time has passed; pickup is still upcoming"
          : "Pickup reminder time has passed",
      past: !schedule.pickupReminderAt
    }
  ];
}

export function formatPickupWindow(schedule: PickupReminderSchedule): string {
  return `${formatReminderDate(schedule.pickupStartsAt)} to ${formatTimeOnly(schedule.pickupEndsAt)}`;
}

function summarizeItems(confirmation: OrderConfirmation): string {
  const itemCount = confirmation.items.reduce((sum, item) => sum + item.quantity, 0);
  const titles = confirmation.items.map((item) => item.product.title);
  const firstTwo = titles.slice(0, 2).join(", ");
  const extraCount = titles.length - 2;
  const suffix = extraCount > 0 ? ` + ${extraCount} more` : "";

  return `${itemCount} ${itemCount === 1 ? "item" : "items"}: ${firstTwo}${suffix}`;
}

function parseDateOrNow(value: string): Date {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
}

function nextZonedWeekdayDate(
  base: Date,
  targetWeekday: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  const baseParts = getZonedParts(base, timezone);
  const baseDateUtc = Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day);
  const baseWeekday = new Date(baseDateUtc).getUTCDay();
  const daysUntil = (targetWeekday - baseWeekday + 7) % 7;
  const candidateDayUtc = baseDateUtc + daysUntil * 24 * 60 * 60 * 1000;
  let candidate = makeDateInTimeZone(
    new Date(candidateDayUtc).getUTCFullYear(),
    new Date(candidateDayUtc).getUTCMonth(),
    new Date(candidateDayUtc).getUTCDate(),
    hour,
    minute,
    timezone
  );

  if (candidate.getTime() <= base.getTime()) {
    const nextWeek = candidateDayUtc + 7 * 24 * 60 * 60 * 1000;
    candidate = makeDateInTimeZone(
      new Date(nextWeek).getUTCFullYear(),
      new Date(nextWeek).getUTCMonth(),
      new Date(nextWeek).getUTCDate(),
      hour,
      minute,
      timezone
    );
  }

  return candidate;
}

function dateForWeekdayBefore(
  pickupParts: ZonedParts,
  targetWeekday: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  const pickupDateUtc = Date.UTC(
    pickupParts.year,
    pickupParts.month - 1,
    pickupParts.day
  );
  const pickupWeekday = new Date(pickupDateUtc).getUTCDay();
  const daysBack = (pickupWeekday - targetWeekday + 7) % 7 || 7;
  const reminderDayUtc = pickupDateUtc - daysBack * 24 * 60 * 60 * 1000;

  return makeDateInTimeZone(
    new Date(reminderDayUtc).getUTCFullYear(),
    new Date(reminderDayUtc).getUTCMonth(),
    new Date(reminderDayUtc).getUTCDate(),
    hour,
    minute,
    timezone
  );
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function makeDateInTimeZone(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  const utcGuess = new Date(Date.UTC(year, monthIndex, day, hour, minute, 0));
  const offset = getTimeZoneOffset(utcGuess, timezone);

  return new Date(utcGuess.getTime() - offset);
}

function getTimeZoneOffset(date: Date, timezone: string): number {
  const parts = getZonedParts(date, timezone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return zonedAsUtc - date.getTime();
}

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const values = formatter.formatToParts(date).reduce<Record<string, string>>(
    (result, part) => {
      if (part.type !== "literal") {
        result[part.type] = part.value;
      }

      return result;
    },
    {}
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

function formatReminderDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_PICKUP.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(isoDate));
}

function formatTimeOnly(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_PICKUP.timezone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(isoDate));
}

function formatReminderSummary(schedule: PickupReminderSchedule): string {
  const reminders = [schedule.confirmationReminderAt, schedule.pickupReminderAt]
    .filter((date): date is string => Boolean(date))
    .map(formatReminderDate);

  return reminders.join(" and ");
}

export async function openSystemNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(STOOPING_NOTIFICATION_CHANNEL_ID, {
    name: "Pickup reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default"
  });
}
