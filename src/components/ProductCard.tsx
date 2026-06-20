import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton } from "./AppButton";
import { colors } from "../theme/colors";
import { spacing, typography } from "../theme/theme";
import type { Product } from "../types/product";

type ProductCardProps = {
  product: Product;
  onPress: () => void;
  onAdd?: () => void;
  inOrder?: boolean;
  imageVisible?: boolean;
  lazyImage?: boolean;
  wide?: boolean;
};

export function ProductCard({
  product,
  onPress,
  onAdd,
  inOrder,
  imageVisible,
  lazyImage,
  wide
}: ProductCardProps) {
  const image = product.images[0];
  const isAvailable = product.availableForSale && product.stockCount > 0;
  const stockLabel = !isAvailable
    ? "Claimed"
    : product.stockCount === 1
      ? "Last one"
      : `${product.stockCount} left`;
  const condition = product.condition || "Good used condition";
  const fallbackLabel = product.category?.slice(0, 2).toUpperCase() || "$0";
  const imageTint = tintForCategory(product.category);
  const showRetail =
    product.estimatedRetailValue && product.estimatedRetailValue !== "Not listed";

  return (
    <View style={[styles.card, wide && styles.wideCard]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${product.title}, free pickup-only item, ${condition}, ${isAvailable ? stockLabel : "claimed"}`}
        onPress={onPress}
        style={({ pressed }) => [styles.contentPressable, pressed && styles.pressed]}
      >
        <View style={[styles.imageWrap, { backgroundColor: imageTint }]}>
          {image ? (
            <LazyProductImage
              lazy={lazyImage}
              uri={image}
              visible={imageVisible ?? !lazyImage}
            />
          ) : (
            <View style={styles.placeholderWrap}>
              <Text style={styles.placeholderIcon}>{fallbackLabel}</Text>
              <Text style={styles.placeholderBrand}>STOOPING CLUB</Text>
            </View>
          )}
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>FREE</Text>
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
          <Text numberOfLines={1} style={styles.condition}>
            {condition}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.price}>$0</Text>
            <Text style={styles.pickupOnly}>Pickup only</Text>
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
          <AppButton
            disabled={!isAvailable || inOrder}
            label={!isAvailable ? "Claimed" : inOrder ? "In your order" : "Add to order"}
            onPress={onAdd}
            style={styles.addButton}
            variant={inOrder ? "accent" : "primary"}
          />
        </View>
      ) : null}
    </View>
  );
}

function LazyProductImage({
  lazy,
  uri,
  visible
}: {
  lazy?: boolean;
  uri: string;
  visible: boolean;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(lazy && !visible ? 0 : 1)).current;
  const [shouldRender, setShouldRender] = useState(!lazy || visible);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!lazy || visible) {
      setShouldRender(true);
    }
  }, [lazy, visible]);

  useEffect(() => {
    if (!lazy || !visible || !loaded) return;

    Animated.timing(fade, {
      duration: 320,
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [fade, lazy, loaded, visible]);

  useEffect(() => {
    if (!lazy || (visible && loaded)) return;

    shimmer.setValue(0);
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        duration: 1050,
        toValue: 1,
        useNativeDriver: true
      })
    );
    loop.start();
    return () => loop.stop();
  }, [lazy, loaded, shimmer, visible]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 180]
  });

  return (
    <>
      {lazy && (!visible || !loaded) ? (
        <View style={styles.skeleton}>
          <Animated.View
            style={[
              styles.skeletonShine,
              { transform: [{ translateX: shimmerTranslate }, { rotate: "18deg" }] }
            ]}
          />
        </View>
      ) : null}
      {shouldRender ? (
        <Animated.Image
          source={{ uri }}
          onLoad={() => setLoaded(true)}
          resizeMode="cover"
          style={[styles.image, lazy && { opacity: fade }]}
        />
      ) : null}
    </>
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
  skeleton: {
    backgroundColor: colors.paper2,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0
  },
  skeletonShine: {
    backgroundColor: "rgba(255,255,255,0.56)",
    height: "140%",
    left: "38%",
    position: "absolute",
    top: "-20%",
    width: 56
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
  freeBadge: {
    alignItems: "center",
    backgroundColor: colors.forest,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm
  },
  freeBadgeText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16
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
  condition: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
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
  pickupOnly: {
    color: colors.moss,
    fontSize: 12,
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
