import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import { spacing, typography } from "../../../theme/theme";
import type { Product } from "../../../types/product";

type StrollProductFaceProps = {
  inOrder?: boolean;
  onPress: () => void;
  product: Product;
};

export function StrollProductFace({
  inOrder,
  onPress,
  product
}: StrollProductFaceProps) {
  const image = product.images[0];
  const condition = product.condition || "Good used condition";
  const story = getOriginStory(product);
  const stockLabel = inOrder
    ? "In your order"
    : product.stockCount === 1
      ? "Last one"
      : `${product.stockCount} left`;

  return (
    <Pressable
      accessibilityHint="Opens item details"
      accessibilityLabel={`${product.title}, free pickup-only item, ${condition}, ${stockLabel}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.imageWrap, { backgroundColor: tintForCategory(product.category) }]}>
        {image ? (
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={{ uri: image }}
            style={styles.image}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {product.category?.slice(0, 2).toUpperCase() || "$0"}
            </Text>
            <Text style={styles.placeholderBrand}>STOOPING CLUB</Text>
          </View>
        )}
        <View style={styles.freeBadge}>
          <Text style={styles.freeBadgeText}>$0</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={[typography.h2, styles.title]}>
          {product.title}
        </Text>
        <View style={styles.pillRow}>
          <Pill label={product.category || "Free find"} tone="category" />
          <Pill label={stockLabel} tone={inOrder ? "reserved" : "stock"} />
          <Pill label={condition} tone="neutral" />
        </View>
        <View style={styles.storyRow}>
          <Text style={styles.pin}>STORY</Text>
          <Text numberOfLines={3} style={styles.story}>
            {story}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function Pill({
  label,
  tone
}: {
  label: string;
  tone: "category" | "neutral" | "reserved" | "stock";
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === "category" && styles.categoryPill,
        tone === "reserved" && styles.reservedPill,
        tone === "stock" && styles.stockPill
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.pillText,
          tone === "category" && styles.categoryPillText,
          tone === "reserved" && styles.reservedPillText,
          tone === "stock" && styles.stockPillText
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function getOriginStory(product: Product) {
  const firstSentence = product.description.split(".")[0]?.trim();

  if (firstSentence) {
    return `${firstSentence}.`;
  }

  return `${product.category || "This find"} is ready for a second life at Sunday pickup.`;
}

function tintForCategory(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("kid") || normalized.includes("toy")) return "#FBEFDD";
  if (normalized.includes("furniture")) return "#EDE6DA";
  if (normalized.includes("decor") || normalized.includes("lamp")) return "#F2E7E4";
  if (normalized.includes("book")) return "#E5ECEA";
  if (normalized.includes("electronic") || normalized.includes("tech")) return "#E7EAF1";
  if (normalized.includes("plant")) return "#E2EFE0";
  if (normalized.includes("kitchen") || normalized.includes("dish")) return "#EAF0DE";
  return "#EFE9DB";
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden"
  },
  categoryPill: {
    backgroundColor: colors.cream
  },
  categoryPillText: {
    color: colors.forest
  },
  freeBadge: {
    backgroundColor: colors.forest,
    borderRadius: 999,
    bottom: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    position: "absolute"
  },
  freeBadgeText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: "900"
  },
  image: {
    height: "100%",
    width: "100%"
  },
  imageWrap: {
    flex: 1.1,
    minHeight: 136,
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  pill: {
    backgroundColor: colors.paper2,
    borderRadius: 999,
    maxWidth: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  pillText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  pin: {
    color: colors.forest,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 18
  },
  placeholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  placeholderBrand: {
    bottom: spacing.md,
    color: "rgba(40,38,28,0.16)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    position: "absolute",
    right: spacing.md
  },
  placeholderText: {
    color: "rgba(40,38,28,0.22)",
    fontSize: 54,
    fontWeight: "900"
  },
  pressed: {
    opacity: 0.86
  },
  reservedPill: {
    backgroundColor: colors.lime
  },
  reservedPillText: {
    color: colors.limeInk
  },
  stockPill: {
    backgroundColor: colors.lowStockBg
  },
  stockPillText: {
    color: colors.lowStock
  },
  story: {
    color: colors.ink2,
    flex: 1,
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: "700",
    lineHeight: 20
  },
  storyRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: "auto"
  },
  title: {
    fontSize: 21,
    lineHeight: 26
  }
});
