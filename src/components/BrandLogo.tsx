import { Image, StyleSheet, Text, View } from "react-native";

import logo from "../../assets/brand/stooping-logo.png";
import { colors } from "../theme/colors";
import { spacing } from "../theme/theme";

type BrandLogoProps = {
  size?: "small" | "medium" | "large";
  showWordmark?: boolean;
};

const imageSizes = {
  small: { height: 32, width: 40 },
  medium: { height: 52, width: 65 },
  large: { height: 72, width: 90 }
};

export function BrandLogo({ size = "medium", showWordmark = true }: BrandLogoProps) {
  return (
    <View style={styles.row}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Stooping Club logo"
        resizeMode="contain"
        source={logo}
        style={imageSizes[size]}
      />
      {showWordmark ? (
        <View>
          <Text style={[styles.wordmark, size === "small" && styles.wordmarkSmall]}>
            Stooping Club
          </Text>
          <Text style={styles.tagline}>Everything is $0</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  wordmark: {
    color: colors.forest,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26
  },
  wordmarkSmall: {
    fontSize: 18,
    lineHeight: 22
  },
  tagline: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  }
});
