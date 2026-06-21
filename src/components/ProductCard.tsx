import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "./AppButton";
import { OrderFullButton } from "./OrderFullNotice";
import { colors } from "../theme/colors";
import { spacing, typography } from "../theme/theme";
import type { Product } from "../types/product";

type ProductCardProps = {
  product: Product;
  onPress: () => void;
  onAdd?: () => void;
  onOrderFullPress?: () => void;
  inOrder?: boolean;
  orderFull?: boolean;
  wide?: boolean;
};

export function ProductCard({
  product,
  onPress,
  onAdd,
  onOrderFullPress,
  inOrder,
  orderFull,
  wide
}: ProductCardProps) {
  const image = product.images[0];
  const isAvailable = product.availableForSale && product.stockCount > 0;
  const stockLabel = !isAvailable
    ? "Claimed"
    : product.stockCount === 1
      ? "Last one"
      : `${product.stockCount} left`;
  const fallbackLabel = product.category?.slice(0, 2).toUpperCase() || "$0";
  const imageTint = tintForCategory(product.category);
  const showRetail =
    product.estimatedRetailValue && product.estimatedRetailValue !== "Not listed";

  return (
    <View style={[styles.card, wide && styles.wideCard]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${product.title}, ${isAvailable ? "available" : "claimed"}`}
        onPress={onPress}
        style={({ pressed }) => [styles.contentPressable, pressed && styles.pressed]}
      >
        <View style={[styles.imageWrap, { backgroundColor: imageTint }]}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderWrap}>
              <Text style={styles.placeholderIcon}>{fallbackLabel}</Text>
              <Text style={styles.placeholderBrand}>STOOPING CLUB</Text>
            </View>
          )}
          <View style={styles.heartBadge}>
            <Text style={styles.heartText}>♡</Text>
          </View>
        </View>
        <View style={styles.body}>
          <View style={[styles.badge, !isAvailable && styles.badgeMuted]}>
            <Text style={[styles.badgeText, !isAvailable && styles.badgeMutedText]}>
              {stockLabel}
            </Text>
          </View>
          <Text numberOfLines={2} style={styles.title}>
            {product.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.price}>$0</Text>
            {showRetail ? (
              <Text numberOfLines={1} style={styles.retail}>
                {product.estimatedRetailValue}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      {onAdd ? (
        <View style={styles.actionWrap}>
          {orderFull && !inOrder && isAvailable ? (
            <OrderFullButton
              onPress={onOrderFullPress ?? onAdd}
              style={styles.addButton}
            />
          ) : (
            <AppButton
              disabled={!isAvailable || inOrder}
              label={!isAvailable ? "Claimed" : inOrder ? "In your order" : "Add to order"}
              onPress={onAdd}
              style={styles.addButton}
              variant={inOrder ? "accent" : "primary"}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

function tintForCategory(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("kid") || normalized.includes("toy")) return "#F7EBD8";
  if (normalized.includes("lamp") || normalized.includes("decor")) return "#F1E3E1";
  if (normalized.includes("book") || normalized.includes("tech")) return "#E8EBF2";
  if (normalized.includes("kitchen") || normalized.includes("dish")) return "#EAF3E0";
  return "#EFE9DB";
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 8,
    flex: 1,
    overflow: "hidden"
  },
  wideCard: {
    alignSelf: "flex-start",
    flex: 0,
    minHeight: 308,
    width: 164
  },
  contentPressable: {
    flex: 1
  },
  pressed: {
    opacity: 0.8
  },
  imageWrap: {
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  image: {
    height: "100%",
    width: "100%"
  },
  placeholderWrap: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center"
  },
  placeholderIcon: {
    color: "rgba(40,38,28,0.28)",
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center"
  },
  placeholderBrand: {
    bottom: spacing.sm,
    color: "rgba(40,38,28,0.16)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    position: "absolute",
    right: spacing.sm
  },
  heartBadge: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    width: 34
  },
  heartText: {
    color: colors.muted,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 28
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.lowStockBg,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  badgeMuted: {
    backgroundColor: colors.paper2
  },
  badgeText: {
    color: colors.lowStock,
    fontSize: 12,
    fontWeight: "900"
  },
  badgeMutedText: {
    color: colors.muted
  },
  body: {
    gap: spacing.xs,
    paddingTop: spacing.sm
  },
  title: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    minHeight: 36
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  price: {
    color: colors.forest,
    fontSize: 18,
    fontWeight: "900"
  },
  retail: {
    ...typography.caption,
    color: colors.faint,
    fontWeight: "800",
    textDecorationLine: "line-through"
  },
  actionWrap: {
    paddingTop: spacing.sm
  },
  addButton: {
    minHeight: 40,
    paddingVertical: spacing.sm
  }
});
