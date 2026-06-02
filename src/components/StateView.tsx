import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing, typography } from "../theme/theme";
import { AppButton } from "./AppButton";
import { StoopyMascot } from "./StoopyMascot";

type StateViewProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  showMascot?: boolean;
};

export function StateView({
  title,
  message,
  actionLabel,
  onAction,
  loading,
  showMascot
}: StateViewProps) {
  return (
    <View style={styles.wrap}>
      {showMascot ? <StoopyMascot caption="" size="small" /> : null}
      {loading ? <ActivityIndicator color={colors.forest} /> : null}
      <Text style={typography.h3}>{title}</Text>
      {message ? <Text style={[typography.body, styles.message]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
    minHeight: 220,
    padding: spacing.xl
  },
  message: {
    color: colors.muted,
    textAlign: "center"
  }
});
