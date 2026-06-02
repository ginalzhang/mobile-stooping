import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing, typography } from "../theme/theme";
import { AppButton } from "./AppButton";

type StateViewProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
};

export function StateView({
  title,
  message,
  actionLabel,
  onAction,
  loading
}: StateViewProps) {
  return (
    <View style={styles.wrap}>
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
