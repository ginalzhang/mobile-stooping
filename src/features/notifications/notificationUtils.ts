import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import { DEFAULT_PICKUP } from "../../constants/pickup";

export const STOOPING_NOTIFICATION_CHANNEL_ID = "stooping-pickup-reminders";

export const STOOPING_NOTIFICATION_IDS = {
  fridayConfirmation: "stooping-friday-confirmation-reminder",
  sundayPickup: "stooping-sunday-pickup-reminder"
} as const;

export const NOTIFICATION_TIMEZONE = DEFAULT_PICKUP.timezone;

export const NOTIFICATION_COPY = {
  timezoneLabel: "America/Los_Angeles",
  permissionTitle: "Pickup reminders",
  permissionBody:
    "Get a Friday confirmation reminder and a Sunday pickup reminder for Stooping Club orders.",
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
  message: string;
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

export async function scheduleStoopingReminderNotifications(): Promise<ReminderScheduleResult> {
  const permissionState = await requestNotificationPermission();

  if (permissionState !== "granted") {
    return {
      status: permissionState === "unavailable" ? "unavailable" : "denied",
      permissionState,
      message:
        permissionState === "unavailable"
          ? NOTIFICATION_COPY.unavailableFallback
          : NOTIFICATION_COPY.deniedFallback
    };
  }

  try {
    await ensureNotificationChannel();
    await cancelStoopingReminderNotifications();

    await Promise.all([
      Notifications.scheduleNotificationAsync({
        identifier: STOOPING_NOTIFICATION_IDS.fridayConfirmation,
        content: {
          title: NOTIFICATION_COPY.fridayTitle,
          body: NOTIFICATION_COPY.fridayBody,
          data: {
            reminder: "friday-confirmation",
            pickupWindow: DEFAULT_PICKUP.window,
            timezone: NOTIFICATION_TIMEZONE
          },
          sound: "default"
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: 6,
          hour: 9,
          minute: 0,
          repeats: true,
          timezone: NOTIFICATION_TIMEZONE,
          channelId: STOOPING_NOTIFICATION_CHANNEL_ID
        }
      }),
      Notifications.scheduleNotificationAsync({
        identifier: STOOPING_NOTIFICATION_IDS.sundayPickup,
        content: {
          title: NOTIFICATION_COPY.sundayTitle,
          body: NOTIFICATION_COPY.sundayBody,
          data: {
            reminder: "sunday-pickup",
            pickupWindow: DEFAULT_PICKUP.window,
            timezone: NOTIFICATION_TIMEZONE
          },
          sound: "default"
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: 1,
          hour: 10,
          minute: 0,
          repeats: true,
          timezone: NOTIFICATION_TIMEZONE,
          channelId: STOOPING_NOTIFICATION_CHANNEL_ID
        }
      })
    ]);

    return {
      status: "scheduled",
      permissionState,
      notificationIds: STOOPING_NOTIFICATION_IDS,
      message: `Reminders are on for Friday at 9:00 AM and Sunday at 10:00 AM (${DEFAULT_PICKUP.timezone}).`
    };
  } catch {
    return {
      status: "unavailable",
      permissionState: "unavailable",
      message: NOTIFICATION_COPY.unavailableFallback
    };
  }
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
