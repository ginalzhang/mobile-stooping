import { useEffect, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import Animated, { FadeInDown, FadeOut, ZoomIn } from "react-native-reanimated";

import { fetchProduct } from "../../api/shopify";
import { AppButton } from "../../components/AppButton";
import { Screen } from "../../components/Screen";
import { StateView } from "../../components/StateView";
import { DEFAULT_PICKUP } from "../../constants/pickup";
import { useCart } from "../cart/CartContext";
import type { ShopStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { spacing, typography } from "../../theme/theme";

type Props = NativeStackScreenProps<ShopStackParamList, "ProductDetail">;

export function ProductDetailScreen({ route, navigation }: Props) {
  const { addItem } = useCart();
  const { productId, handle } = route.params;
  const { width } = useWindowDimensions();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productQuery = useQuery({
    queryKey: ["product", productId, handle],
    queryFn: () => fetchProduct({ id: productId, handle })
  });
  const imageCount = productQuery.data?.images.length ?? 0;
  const heroImageWidth = Math.min(420, Math.max(0, width - spacing.lg * 2));

  useEffect(() => {
    setActiveImageIndex(0);
    setShowAddedFeedback(false);
  }, [productId, handle, imageCount]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  if (productQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <StateView title="Loading item" loading />
      </Screen>
    );
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <Screen>
        <StateView
          title="Item could not load"
          message="It may have been claimed or the network request failed."
          actionLabel="Back to shop"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const product = productQuery.data;
  const isAvailable = product.availableForSale && product.stockCount > 0;
  const condition = product.condition || "Good used condition";
  const category = product.category || "Uncategorized";
  const retailValue =
    product.estimatedRetailValue && product.estimatedRetailValue !== "Not listed"
      ? product.estimatedRetailValue
      : null;

  const onAdd = () => {
    const result = addItem(product);
    if (!result.ok) {
      Alert.alert("Could not add item", result.message);
      return;
    }
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setShowAddedFeedback(true);
    feedbackTimeoutRef.current = setTimeout(() => {
      setShowAddedFeedback(false);
      feedbackTimeoutRef.current = null;
    }, 4000);
  };

  const onImageScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageWidth = event.nativeEvent.layoutMeasurement.width;
    if (!pageWidth || imageCount < 1) {
      return;
    }
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setActiveImageIndex(Math.max(0, Math.min(nextIndex, imageCount - 1)));
  };

  return (
    <Screen>
      <Animated.View
        entering={FadeInDown.duration(220)}
        style={[styles.heroFrame, { width: heroImageWidth }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to shop"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onImageScrollEnd}
        >
          {product.images.length ? (
            product.images.map((uri, index) => (
              <Image
                key={`${uri}-${index}`}
                source={{ uri }}
                style={[
                  styles.heroImage,
                  { width: heroImageWidth },
                  !isAvailable && styles.claimedImage
                ]}
              />
            ))
          ) : (
            <View
              style={[styles.heroImage, styles.imageFallback, { width: heroImageWidth }]}
            >
              <Text style={styles.placeholderIcon}>{category.slice(0, 2)}</Text>
              <Text style={styles.placeholderBrand}>STOOPING CLUB</Text>
            </View>
          )}
        </ScrollView>
        {imageCount > 1 ? (
          <View style={styles.paginationDots} pointerEvents="none">
            {product.images.map((uri, index) => (
              <View
                key={`dot-${uri}-${index}`}
                style={[
                  styles.paginationDot,
                  index === activeImageIndex && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        ) : null}
        {!isAvailable ? (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedBadgeText}>Claimed</Text>
          </View>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(220)} style={styles.section}>
        <Text style={typography.h1}>{product.title}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>$0</Text>
          {retailValue ? <Text style={styles.retailValue}>{retailValue}</Text> : null}
          {retailValue ? <Text style={styles.retailLabel}>est. retail value</Text> : null}
        </View>
        <View style={styles.chips}>
          <DetailPill label={condition} tone="good" />
          <DetailPill
            label={isAvailable ? `${product.stockCount || 1} in stock` : "Claimed"}
            tone={isAvailable ? "neutral" : "claimed"}
          />
          <DetailPill label={category} tone="neutral" />
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(130).duration(220)}
        style={styles.pickupSection}
      >
        <Text style={styles.sectionLabel}>Pickup</Text>
        <Text style={typography.body}>
          {DEFAULT_PICKUP.window} at {DEFAULT_PICKUP.address}. Local pickup only, no
          delivery, no shipping.
        </Text>
      </Animated.View>

      {isAvailable ? (
        <Animated.View entering={FadeInDown.delay(180).duration(220)}>
          <AppButton label="Add to Order" onPress={onAdd} style={styles.bottomAction} />
          {showAddedFeedback ? (
            <Animated.View
              entering={ZoomIn.duration(160)}
              exiting={FadeOut.duration(120)}
              style={styles.addedFeedback}
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.addedFeedbackText}>
                Added to order. This free find is in your order.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.getParent()?.navigate("Order")}
                style={styles.viewOrderButton}
              >
                <Text style={styles.viewOrderText}>View order</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeInDown.delay(180).duration(220)}
          style={styles.claimedFooter}
        >
          <Text style={styles.claimedFooterText}>
            This one’s been claimed — keep strolling for more.
          </Text>
        </Animated.View>
      )}
    </Screen>
  );
}

function DetailPill({
  label,
  tone
}: {
  label: string;
  tone: "good" | "claimed" | "neutral";
}) {
  return (
    <View
      style={[
        styles.detailPill,
        tone === "good" && styles.goodPill,
        tone === "claimed" && styles.claimedPill
      ]}
    >
      <Text
        style={[
          styles.detailPillText,
          tone === "good" && styles.goodPillText,
          tone === "claimed" && styles.claimedPillText
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroFrame: {
    alignSelf: "center",
    position: "relative"
  },
  heroImage: {
    aspectRatio: 1,
    backgroundColor: colors.paper2,
    borderRadius: 8
  },
  claimedImage: {
    opacity: 0.5
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  placeholderIcon: {
    color: "rgba(40,38,28,0.16)",
    fontSize: 56,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  placeholderBrand: {
    bottom: spacing.md,
    color: "rgba(40,38,28,0.14)",
    fontSize: 12,
    fontWeight: "900",
    position: "absolute",
    right: spacing.md
  },
  claimedBadge: {
    alignSelf: "center",
    backgroundColor: colors.card,
    borderRadius: 999,
    left: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
    right: 0,
    top: "34%"
  },
  claimedBadgeText: {
    color: colors.rust,
    fontSize: 15,
    fontWeight: "900"
  },
  paginationDots: {
    alignItems: "center",
    bottom: spacing.md,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0
  },
  paginationDot: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: "rgba(40,38,28,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 8,
    width: 8
  },
  paginationDotActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
    width: 18
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.lg
  },
  priceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  price: {
    color: colors.forest,
    fontSize: 30,
    fontWeight: "900"
  },
  retailValue: {
    color: colors.faint,
    fontSize: 14,
    fontWeight: "900",
    textDecorationLine: "line-through"
  },
  retailLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  detailPill: {
    backgroundColor: colors.paper2,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  goodPill: {
    backgroundColor: "#E8F4DF"
  },
  claimedPill: {
    backgroundColor: colors.dangerBg
  },
  detailPillText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  goodPillText: {
    color: colors.forest
  },
  claimedPillText: {
    color: colors.rust
  },
  pickupSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingTop: spacing.lg
  },
  sectionLabel: {
    color: colors.forest,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  bottomAction: {
    marginTop: spacing.xl
  },
  addedFeedback: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginTop: spacing.md,
    padding: spacing.md
  },
  addedFeedbackText: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19
  },
  viewOrderButton: {
    borderColor: colors.forest,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  viewOrderText: {
    color: colors.forest,
    fontSize: 13,
    fontWeight: "900"
  },
  claimedFooter: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.xl,
    paddingVertical: spacing.xl
  },
  claimedFooterText: {
    color: colors.rust,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "center"
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    left: spacing.md,
    position: "absolute",
    top: spacing.md,
    width: 44,
    zIndex: 2
  },
  backText: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 34
  }
});
