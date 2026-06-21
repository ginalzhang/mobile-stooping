import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { colors } from "../../theme/colors";
import { radii, spacing, typography } from "../../theme/theme";
import {
  cancelStoopingReminderNotifications,
  getNotificationPermissionState,
  NOTIFICATION_COPY,
  openSystemNotificationSettings,
  scheduleStoopingReminderNotifications,
  type NotificationPermissionState,
  type ReminderScheduleResult
} from "./notificationUtils";

type NotificationPermissionCardProps = {
  onScheduled?: (result: ReminderScheduleResult) => void;
  onCancelled?: () => void;
};

export function NotificationPermissionCard({
  onScheduled,
  onCancelled
}: NotificationPermissionCardProps) {
  const [permissionState, setPermissionState] =
    useState<NotificationPermissionState>("undetermined");
  const [message, setMessage] = useState<string>(NOTIFICATION_COPY.permissionBody);
  const [busyAction, setBusyAction] = useState<"schedule" | "cancel" | null>(null);

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

  const denied = permissionState === "denied" || permissionState === "unavailable";
  const enabled = permissionState === "granted";

  async function handleSchedule() {
    setBusyAction("schedule");

    try {
      const result = await scheduleStoopingReminderNotifications();
      setPermissionState(result.permissionState);
      setMessage(result.message);
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
        <View style={[styles.statusPill, enabled && styles.statusPillEnabled]}>
          <Text style={[styles.statusText, enabled && styles.statusTextEnabled]}>
            {enabled ? "On" : "Off"}
          </Text>
        </View>
      </View>

      <Text style={[typography.body, styles.message]}>{message}</Text>

      <View style={styles.reminders}>
        <ReminderRow day="Friday" detail="9:00 AM confirmation reminder" />
        <ReminderRow day="Sunday" detail="10:00 AM pickup reminder" />
      </View>

      <View style={styles.actions}>
        <AppButton
          label={enabled ? "Refresh reminders" : "Enable reminders"}
          loading={busyAction === "schedule"}
          onPress={handleSchedule}
        />
        <AppButton
          label="Cancel reminders"
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
};

function ReminderRow({ day, detail }: ReminderRowProps) {
  return (
    <View style={styles.reminderRow}>
      <Text style={styles.reminderDay}>{day}</Text>
      <Text style={styles.reminderDetail}>{detail}</Text>
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
    borderRadius: radii.card,
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
  reminderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  reminders: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: radii.inner,
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
    borderRadius: radii.pill,
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
