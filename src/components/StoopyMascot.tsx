import { Image, StyleSheet, Text, View } from "react-native";

import stoopy from "../../assets/brand/stoopy-mascot.png";
import { colors } from "../theme/colors";
import { spacing } from "../theme/theme";

type StoopyMascotProps = {
  size?: "small" | "medium" | "large";
  caption?: string;
};

const mascotSizes = {
  small: { height: 86, width: 98 },
  medium: { height: 132, width: 150 },
  large: { height: 176, width: 200 }
};

export function StoopyMascot({
  size = "medium",
  caption = "Stoopy"
}: StoopyMascotProps) {
  return (
    <View style={[styles.card, size === "small" && styles.smallCard]}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Stoopy mascot"
        resizeMode="contain"
        source={stoopy}
        style={mascotSizes[size]}
      />
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 8,
    borderWidth: 0,
    gap: spacing.xs,
    padding: 0
  },
  smallCard: {
    padding: 0
  },
  caption: {
    color: colors.forest,
    fontSize: 13,
    fontWeight: "900"
  }
});
