import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { spacing, typography } from "../../theme/theme";
import { useCart } from "../cart/CartContext";
import { NotificationPermissionCard } from "./NotificationPermissionCard";
import {
  buildReminderOrderDetails,
  NOTIFICATION_COPY
} from "./notificationUtils";

export function NotificationsScreen() {
  const { confirmation } = useCart();
  const orderCode = confirmation ? createOrderCode(confirmation.confirmedAt) : undefined;
  const order =
    confirmation && orderCode
      ? buildReminderOrderDetails(confirmation, orderCode)
      : undefined;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.h1}>Notifications</Text>
        <Text style={[typography.body, styles.copy]}>{NOTIFICATION_COPY.permissionBody}</Text>
      </View>
      <NotificationPermissionCard order={order} />
    </Screen>
  );
}

function createOrderCode(confirmedAt: string): string {
  const timestamp = Number.isFinite(Date.parse(confirmedAt))
    ? Date.parse(confirmedAt)
    : Date.now();

  return `STOOP-${Math.abs(timestamp).toString(36).slice(-6).toUpperCase()}`;
}

const styles = StyleSheet.create({
  copy: {
    color: colors.muted
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg
  }
});
