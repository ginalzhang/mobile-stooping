import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../theme/colors";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.paper2,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  selected: {
    backgroundColor: colors.forest,
    borderColor: colors.forest
  },
  label: {
    color: colors.forest,
    fontSize: 14,
    fontWeight: "700"
  },
  selectedLabel: {
    color: colors.card
  }
});
