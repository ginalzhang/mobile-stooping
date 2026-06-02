import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing, typography } from "../theme/theme";
import type { Product } from "../types/product";

type ProductCardProps = {
  product: Product;
  onPress: () => void;
};

export function ProductCard({ product, onPress }: ProductCardProps) {
  const image = product.images[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.title}, ${product.availableForSale ? "available" : "out of stock"}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={styles.placeholder}>$0</Text>
        )}
        <View style={[styles.badge, !product.availableForSale && styles.badgeMuted]}>
          <Text style={styles.badgeText}>
            {product.availableForSale ? `${product.stockCount || 1} left` : "Out"}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title}>
          {product.title}
        </Text>
        <Text style={styles.price}>$0.00</Text>
        <Text numberOfLines={1} style={typography.caption}>
          {product.category}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden"
  },
  pressed: {
    opacity: 0.8
  },
  imageWrap: {
    aspectRatio: 1,
    backgroundColor: "#ECE7DD",
    position: "relative"
  },
  image: {
    height: "100%",
    width: "100%"
  },
  placeholder: {
    color: colors.forest,
    fontSize: 28,
    fontWeight: "900",
    marginTop: "40%",
    textAlign: "center"
  },
  badge: {
    backgroundColor: colors.lime,
    borderRadius: 999,
    bottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "absolute",
    right: spacing.sm
  },
  badgeMuted: {
    backgroundColor: "#DDD8CE"
  },
  badgeText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  body: {
    gap: spacing.xs,
    padding: spacing.md
  },
  title: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    minHeight: 38
  },
  price: {
    color: colors.forest,
    fontSize: 16,
    fontWeight: "900"
  }
});
