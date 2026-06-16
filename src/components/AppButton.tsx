import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { colors } from "../theme/colors";

type AppButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  variant?: "primary" | "secondary" | "accent" | "danger";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  variant = "primary",
  loading,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style
      ]}
      {...props}
    >
      {loading ? (
        <Animated.View key="loading" entering={ZoomIn.duration(120)}>
          <ActivityIndicator color={variant === "primary" ? colors.card : colors.forest} />
        </Animated.View>
      ) : (
        <Animated.View key={label} entering={ZoomIn.duration(120)}>
          <Text
            style={[
              styles.label,
              variant === "primary" && styles.primaryLabel,
              variant === "accent" && styles.accentLabel
            ]}
          >
            {label}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  primary: {
    backgroundColor: colors.forest
  },
  secondary: {
    backgroundColor: colors.card,
    borderColor: colors.forest,
    borderWidth: 1.5
  },
  accent: {
    backgroundColor: colors.lime
  },
  danger: {
    backgroundColor: "#F7E0DC",
    borderColor: colors.danger,
    borderWidth: 1
  },
  disabled: {
    opacity: 0.48
  },
  pressed: {
    transform: [{ scale: 0.99 }]
  },
  label: {
    color: colors.forest,
    fontSize: 16,
    fontWeight: "800"
  },
  primaryLabel: {
    color: colors.card
  },
  accentLabel: {
    color: colors.limeInk
  }
});
