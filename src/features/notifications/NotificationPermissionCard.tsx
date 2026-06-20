import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { colors } from "../../theme/colors";
import { radii, spacing, typography } from "../../theme/theme";
import {
  cancelStoopingReminderNotifications,
  getNotificationPermissionState,
  NOTIFICATION_COPY,
  getPickupReminderSchedule,
  getReminderDisplayRows,
  openSystemNotificationSettings,
  scheduleStoopingReminderNotifications,
  type NotificationPermissionState,
  type ReminderOrderDetails,
  type ReminderScheduleResult
} from "./notificationUtils";

type NotificationPermissionCardProps = {
  order?: ReminderOrderDetails;
  onScheduled?: (result: ReminderScheduleResult) => void;
  onCancelled?: () => void;
};

export function NotificationPermissionCard({
  order,
  onScheduled,
  onCancelled
}: NotificationPermissionCardProps) {
  const [permissionState, setPermissionState] =
    useState<NotificationPermissionState>("undetermined");
  const [message, setMessage] = useState<string>(
    order
      ? "Schedule one-time reminders for this pickup."
      : "Start checkout first, then schedule reminders from your pickup pass."
  );
  const [busyAction, setBusyAction] = useState<"schedule" | "cancel" | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const schedule = order ? getPickupReminderSchedule(order.confirmedAt) : null;
  const reminderRows = schedule ? getReminderDisplayRows(schedule) : [];

  useEffect(() => {
    let mounted = true;

    getNotificationPermissionState().then((state) => {
      if (mounted) {
        setPermissionState(state);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setMessage(
      order
        ? "Schedule one-time reminders for this pickup."
        : "Start checkout first, then schedule reminders from your pickup pass."
    );
    setScheduled(false);
  }, [order?.orderCode]);

  const denied = permissionState === "denied" || permissionState === "unavailable";
  const permissionGranted = permissionState === "granted";
  const statusLabel = scheduled ? "Scheduled" : permissionGranted ? "Allowed" : "Off";

  async function handleSchedule() {
    setBusyAction("schedule");

    try {
      const result = await scheduleStoopingReminderNotifications(order);
      setPermissionState(result.permissionState);
      setMessage(result.message);
      setScheduled(result.status === "scheduled");
      onScheduled?.(result);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancel() {
    setBusyAction("cancel");

    try {
      await cancelStoopingReminderNotifications();
      setMessage("Stooping Club pickup reminders are off on this device.");
      setScheduled(false);
      onCancelled?.();
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={typography.h2}>{NOTIFICATION_COPY.permissionTitle}</Text>
          <Text style={[typography.caption, styles.timezone]}>
            Times shown in {NOTIFICATION_COPY.timezoneLabel}
          </Text>
        </View>
        <View style={[styles.statusPill, scheduled && styles.statusPillEnabled]}>
          <Text style={[styles.statusText, scheduled && styles.statusTextEnabled]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text style={[typography.body, styles.message]}>{message}</Text>

      <View style={styles.reminders}>
        {reminderRows.length ? (
          reminderRows.map((row) => (
            <ReminderRow
              key={row.label}
              day={row.label}
              detail={row.detail}
              muted={row.past}
            />
          ))
        ) : (
          <Text style={[typography.caption, styles.emptyReminders]}>
            No order-specific pickup reminders are available yet.
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <AppButton
          disabled={!order}
          label={scheduled ? "Refresh reminders" : "Enable reminders"}
          loading={busyAction === "schedule"}
          onPress={handleSchedule}
        />
        <AppButton
          label="Cancel reminders"
          disabled={!permissionGranted && !scheduled}
          loading={busyAction === "cancel"}
          onPress={handleCancel}
          variant="secondary"
        />
      </View>

      {denied ? (
        <Pressable
          accessibilityRole="button"
          onPress={openSystemNotificationSettings}
          style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}
        >
          <Text style={styles.settingsText}>Open notification settings</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ReminderRowProps = {
  day: string;
  detail: string;
  muted?: boolean;
};

function ReminderRow({ day, detail, muted }: ReminderRowProps) {
  return (
    <View style={styles.reminderRow}>
      <Text style={[styles.reminderDay, muted && styles.reminderMuted]}>{day}</Text>
      <Text style={[styles.reminderDetail, muted && styles.reminderMuted]}>
        {detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  message: {
    color: colors.muted
  },
  emptyReminders: {
    color: colors.muted
  },
  pressed: {
    opacity: 0.7
  },
  reminderDay: {
    color: colors.forest,
    fontSize: 15,
    fontWeight: "800",
    width: 72
  },
  reminderDetail: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    lineHeight: 20
  },
  reminderMuted: {
    color: colors.muted
  },
  reminderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  reminders: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  settingsLink: {
    alignItems: "center",
    minHeight: 40,
    justifyContent: "center"
  },
  settingsText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "800"
  },
  statusPill: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  statusPillEnabled: {
    backgroundColor: colors.lime,
    borderColor: colors.lime
  },
  statusText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  statusTextEnabled: {
    color: colors.ink
  },
  timezone: {
    color: colors.moss
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs
  }
});
