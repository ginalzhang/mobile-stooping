import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { spacing, typography } from "../../theme/theme";
import { NotificationPermissionCard } from "./NotificationPermissionCard";
import { NOTIFICATION_COPY } from "./notificationUtils";

export function NotificationsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.h1}>Notifications</Text>
        <Text style={[typography.body, styles.copy]}>{NOTIFICATION_COPY.permissionBody}</Text>
      </View>
      <NotificationPermissionCard />
    </Screen>
  );
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
