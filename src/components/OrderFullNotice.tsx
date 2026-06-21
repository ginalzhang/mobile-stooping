import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { ORDER_LIMIT } from "../constants/pickup";
import { colors } from "../theme/colors";
import { spacing } from "../theme/theme";

type OrderFullButtonProps = {
  onPress: () => void;
  style?: object;
};

type OrderFullToastProps = {
  onViewOrder: () => void;
  visible: boolean;
};

export function OrderFullButton({ onPress, style }: OrderFullButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fullButton,
        pressed && styles.fullButtonPressed,
        style
      ]}
    >
      <View style={styles.fullButtonTitleRow}>
        <BagIcon color={colors.faint} size={16} />
        <Text style={styles.fullButtonTitle}>Order full</Text>
      </View>
      <Text style={styles.fullButtonSub}>
        {ORDER_LIMIT} max · remove one to add
      </Text>
    </Pressable>
  );
}

export function OrderFullToast({ onViewOrder, visible }: OrderFullToastProps) {
  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={styles.toastRoot}>
      <View style={styles.toast}>
        <View style={styles.toastIcon}>
          <BagIcon color={colors.card} size={16} />
        </View>
        <Text style={styles.toastText}>
          Your order's full — <Text style={styles.toastStrong}>{ORDER_LIMIT} finds max</Text>.
          Remove one to add more.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onViewOrder}
          style={({ pressed }) => [styles.toastAction, pressed && styles.toastActionPressed]}
        >
          <Text style={styles.toastActionText}>View order</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function OrderFullInlineNote() {
  return (
    <View style={styles.inlineNote}>
      <InfoIcon />
      <Text style={styles.inlineNoteText}>
        Order full ({ORDER_LIMIT}/{ORDER_LIMIT}) — remove a find to add more.
      </Text>
    </View>
  );
}

function BagIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M6 2l-2 5v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7l-2-5zM4 7h16M8 11a4 4 0 0 0 8 0"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.4}
      />
    </Svg>
  );
}

function InfoIcon() {
  return (
    <Svg fill="none" height={16} viewBox="0 0 24 24" width={16}>
      <Circle cx={12} cy={12} r={9} stroke="#8A6A12" strokeWidth={2.2} />
      <Path
        d="M12 8v5M12 16h.01"
        stroke="#8A6A12"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fullButton: {
    alignItems: "center",
    backgroundColor: "#E4E0D4",
    borderBottomColor: "#CFC9B8",
    borderBottomWidth: 4,
    borderRadius: 16,
    gap: 2,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingTop: 12,
    paddingBottom: 10
  },
  fullButtonPressed: {
    opacity: 0.88
  },
  fullButtonTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  fullButtonTitle: {
    color: "#9A968A",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 18
  },
  fullButtonSub: {
    color: "#9A968A",
    fontSize: 10.5,
    fontWeight: "700",
    lineHeight: 13,
    textAlign: "center"
  },
  toastRoot: {
    bottom: spacing.xl,
    left: spacing.lg,
    position: "absolute",
    right: spacing.lg,
    zIndex: 40
  },
  toast: {
    alignItems: "center",
    backgroundColor: "#23211C",
    borderRadius: 16,
    elevation: 7,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    shadowColor: colors.ink,
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 38
  },
  toastIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  toastText: {
    color: colors.card,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18
  },
  toastStrong: {
    fontWeight: "800"
  },
  toastAction: {
    backgroundColor: "#58CC02",
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  toastActionPressed: {
    opacity: 0.86
  },
  toastActionText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "800"
  },
  inlineNote: {
    alignItems: "center",
    backgroundColor: "#FBEFCF",
    borderColor: "#FFC800",
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inlineNoteText: {
    color: "#8A6A12",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  }
});
