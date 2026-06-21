import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { colors } from "../theme/colors";
import { radii, spacing } from "../theme/theme";
import type { Product } from "../types/product";

type ProductCardProps = {
  product: Product;
  onPress: () => void;
  onAdd?: () => void;
  onOrderFullPress?: () => void;
  inOrder?: boolean;
  orderFull?: boolean;
  variant?: "grid" | "rail";
};

export function ProductCard({
  product,
  onPress,
  onAdd,
  onOrderFullPress,
  inOrder,
  orderFull,
  variant = "grid"
}: ProductCardProps) {
  const image = product.images[0];
  const isAvailable = product.availableForSale && product.stockCount > 0;
  const showLastOne = isAvailable && product.stockCount === 1;
  const showNew = !showLastOne && product.tags.some((tag) => tag.toLowerCase() === "new");
  const fallbackLabel = product.category?.slice(0, 2).toUpperCase() || "SC";
  const imageTint = tintForCategory(product.category);
  const detailLabel = buildDetailLabel(product, isAvailable);

  const addFromOverlay = () => {
    if (!isAvailable || inOrder) return;
    if (orderFull) {
      onOrderFullPress?.();
      return;
    }
    onAdd?.();
  };

  return (
    <View style={[styles.card, variant === "rail" && styles.railCard]}>
      <View
        style={[
          styles.imageWrap,
          variant === "rail" ? styles.railImageWrap : styles.gridImageWrap,
          { backgroundColor: imageTint }
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${product.title}, ${isAvailable ? "available" : "claimed"}`}
          onPress={onPress}
          style={({ pressed }) => [styles.imagePressable, pressed && styles.pressed]}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderWrap}>
              <Text style={styles.placeholderIcon}>{fallbackLabel}</Text>
              <Text style={styles.placeholderBrand}>STOOPING CLUB</Text>
            </View>
          )}
        </Pressable>
        {showLastOne ? (
          <View style={[styles.cornerPill, styles.lastPill, styles.nonInteractiveOverlay]}>
            <Text style={[styles.cornerPillText, styles.lastPillText]}>Last one</Text>
          </View>
        ) : null}
        {showNew ? (
          <View style={[styles.cornerPill, styles.newPill, styles.nonInteractiveOverlay]}>
            <Text style={[styles.cornerPillText, styles.newPillText]}>New</Text>
          </View>
        ) : null}
        <View style={[styles.heartBadge, styles.nonInteractiveOverlay]}>
          <Text style={styles.heartText}>♡</Text>
        </View>
        {onAdd ? (
          <Pressable
            accessibilityLabel={inOrder ? "Already in your order" : `Add ${product.title} to order`}
            accessibilityRole="button"
            disabled={!isAvailable || inOrder}
            onPress={addFromOverlay}
            style={[
              styles.addBadge,
              (!isAvailable || inOrder) && styles.addBadgeDisabled
            ]}
          >
            <Text style={styles.addBadgeText}>{inOrder ? "✓" : "+"}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${product.title}`}
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <Text
          numberOfLines={variant === "rail" ? 2 : 1}
          style={[styles.title, variant === "rail" && styles.railTitle]}
        >
          {product.title}
        </Text>
        <Text numberOfLines={1} style={[styles.detail, variant === "rail" && styles.railDetail]}>
          {detailLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function buildDetailLabel(product: Product, isAvailable: boolean) {
  if (!isAvailable) return "Claimed";
  const primary = product.condition || product.category || "Good condition";
  const secondary = product.stockCount === 1 ? "Last one" : product.category;
  return [primary, secondary].filter(Boolean).join(" · ");
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
    flex: 1,
    overflow: "hidden"
  },
  railCard: {
    flex: 0,
    width: 138
  },
  pressed: {
    opacity: 0.8
  },
  imageWrap: {
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  imagePressable: {
    height: "100%",
    width: "100%"
  },
  nonInteractiveOverlay: {
    pointerEvents: "none"
  },
  gridImageWrap: {
    aspectRatio: 4 / 5,
    borderRadius: radii.photo
  },
  railImageWrap: {
    aspectRatio: 1,
    borderRadius: radii.railPhoto
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
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: radii.pill,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: 7,
    top: 7,
    width: 32
  },
  heartText: {
    color: colors.muted,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 28
  },
  cornerPill: {
    left: 9,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "absolute",
    top: 9,
    borderRadius: radii.pill,
  },
  cornerPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase"
  },
  lastPill: {
    backgroundColor: colors.signal
  },
  lastPillText: {
    color: colors.card
  },
  newPill: {
    backgroundColor: colors.lime
  },
  newPillText: {
    color: colors.limeInk
  },
  addBadge: {
    alignItems: "center",
    backgroundColor: colors.forest,
    borderRadius: radii.pill,
    bottom: 9,
    height: 38,
    justifyContent: "center",
    position: "absolute",
    right: 9,
    width: 38
  },
  addBadgeDisabled: {
    opacity: 0.72
  },
  addBadgeText: {
    color: colors.card,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 30
  },
  body: {
    paddingHorizontal: 2,
    paddingTop: 9
  },
  title: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 17
  },
  railTitle: {
    fontSize: 13,
    lineHeight: 16
  },
  detail: {
    color: colors.muted,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 3
  },
  railDetail: {
    fontSize: 11.5,
    lineHeight: 15
  }
});
