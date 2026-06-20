import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

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
  const [imageIndex, setImageIndex] = useState(0);
  const [claimedAt, setClaimedAt] = useState<number | null>(null);
  const wasAvailable = useRef(false);
  const { addItem } = useCart();
  const { productId, handle } = route.params;
  const { width } = useWindowDimensions();
  const heroWidth = Math.min(420, width - spacing.lg * 2);
  const productQuery = useQuery({
    queryKey: ["product", productId, handle],
    queryFn: () => fetchProduct({ id: productId, handle }),
    refetchInterval: 15000
  });

  useEffect(() => {
    const product = productQuery.data;
    if (!product) return;

    const available = product.availableForSale && product.stockCount > 0;
    if (wasAvailable.current && !available && !claimedAt) {
      setClaimedAt(Date.now());
    }
    if (available) {
      wasAvailable.current = true;
      setClaimedAt(null);
    }
  }, [claimedAt, productQuery.data]);

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
  const imageCount = product.images.length;
  const statusLabel = isAvailable
    ? product.stockCount === 1
      ? "Available, last one"
      : `Available, ${product.stockCount} in stock`
    : "Claimed";

  const onImageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!imageCount) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / heroWidth);
    setImageIndex(Math.min(Math.max(nextIndex, 0), imageCount - 1));
  };

  const onAdd = async () => {
    let latest: typeof product | null = null;
    try {
      latest = await fetchProduct({ id: product.id, handle: product.handle });
    } catch {
      Alert.alert("Could not check stock", "Reconnect and try this find again.");
      return;
    }

    if (!latest || !latest.availableForSale || latest.stockCount <= 0) {
      setClaimedAt(Date.now());
      void productQuery.refetch();
      return;
    }

    const result = addItem(latest);
    if (!result.ok) {
      Alert.alert("Could not add item", result.message);
      return;
    }
    Alert.alert("Added to order", "This free find is in your order.", [
      { text: "Keep browsing" },
      { text: "View order", onPress: () => navigation.getParent()?.navigate("Order") }
    ]);
  };

  return (
    <Screen>
      <View style={styles.detailWrap}>
      <View style={styles.heroFrame}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to shop"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <ScrollView
          accessibilityLabel={
            imageCount > 1
              ? `${product.title} photos, image ${imageIndex + 1} of ${imageCount}`
              : `${product.title} photo`
          }
          horizontal
          onMomentumScrollEnd={onImageScroll}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width: heroWidth }}
        >
          {product.images.length ? (
            product.images.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={[
                  styles.heroImage,
                  { width: heroWidth },
                  !isAvailable && styles.claimedImage
                ]}
              />
            ))
          ) : (
            <View style={[styles.heroImage, styles.imageFallback, { width: heroWidth }]}>
              <Text style={styles.placeholderIcon}>{category.slice(0, 2)}</Text>
              <Text style={styles.placeholderBrand}>STOOPING CLUB</Text>
            </View>
          )}
        </ScrollView>
        {imageCount > 1 ? (
          <View
            accessibilityLabel={`Photo ${imageIndex + 1} of ${imageCount}`}
            style={styles.photoCounter}
          >
            <Text style={styles.photoCounterText}>
              {imageIndex + 1}/{imageCount}
            </Text>
          </View>
        ) : null}
        {!isAvailable ? (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedBadgeText}>Claimed</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={typography.h1}>{product.title}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>$0</Text>
          {retailValue ? <Text style={styles.retailValue}>{retailValue}</Text> : null}
          {retailValue ? <Text style={styles.retailLabel}>est. retail value</Text> : null}
        </View>
        <View style={styles.chips}>
          <DetailPill label={condition} tone="good" />
          <DetailPill
            label={statusLabel}
            tone={isAvailable ? "neutral" : "claimed"}
          />
          <DetailPill label={category} tone="neutral" />
        </View>
      </View>

      <View style={styles.pickupSection}>
        <Text style={styles.sectionLabel}>Free Local Pickup</Text>
        <Text style={typography.body}>
          $0 item, pickup only. Reserve now and pick up {DEFAULT_PICKUP.window} at{" "}
          {DEFAULT_PICKUP.address}. No delivery, no shipping, no payment in app.
        </Text>
      </View>

      <View style={styles.trustSection}>
        <TrustRow label="Reuse check" value="Listed for a second home, not resale." />
        <TrustRow label="Condition" value={condition} />
        <TrustRow label="Status" value={statusLabel} />
      </View>

      {isAvailable && product.stockCount === 1 ? (
        <View style={styles.urgencyStrip}>
          <View style={styles.urgencyDot} />
          <Text style={styles.urgencyText}>
            {2 + (product.id.length % 5)} others looking · last one in stock
          </Text>
        </View>
      ) : null}

      {product.description ? (
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Text style={typography.body}>{product.description}</Text>
        </View>
      ) : null}

      {isAvailable ? (
        <AppButton label="Add to Order" onPress={onAdd} style={styles.bottomAction} />
      ) : (
        <View style={styles.claimedFooter}>
          <Text style={styles.claimedFooterText}>
            This one’s been claimed — keep strolling for more.
          </Text>
        </View>
      )}
      {claimedAt ? (
        <ClaimedInterrupt
          secondsAgo={Math.max(1, Math.floor((Date.now() - claimedAt) / 1000))}
          onFindSimilar={() => navigation.navigate("ShopHome")}
          onKeepBrowsing={() => navigation.goBack()}
        />
      ) : null}
      </View>
    </Screen>
  );
}

function ClaimedInterrupt({
  onFindSimilar,
  onKeepBrowsing,
  secondsAgo
}: {
  onFindSimilar: () => void;
  onKeepBrowsing: () => void;
  secondsAgo: number;
}) {
  return (
    <View style={styles.claimedInterrupt}>
      <View style={styles.claimedInterruptHeader}>
        <View style={styles.claimedIcon}>
          <Text style={styles.claimedIconText}>!</Text>
        </View>
        <View style={styles.claimedInterruptBody}>
          <Text style={styles.claimedInterruptTitle}>Just claimed</Text>
          <Text style={styles.claimedInterruptText}>
            Someone grabbed this {secondsAgo}s ago - it's the only one.
          </Text>
        </View>
      </View>
      <Text style={styles.claimedInterruptText}>
        Everything here is one-of-a-kind. No waitlist, but Stoopy can point you
        to something close.
      </Text>
      <View style={styles.claimedInterruptActions}>
        <AppButton
          label="Keep browsing"
          onPress={onKeepBrowsing}
          style={styles.claimedInterruptButton}
          variant="secondary"
        />
        <AppButton
          label="Find similar"
          onPress={onFindSimilar}
          style={styles.claimedInterruptButton}
        />
      </View>
    </View>
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

function TrustRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.trustRow}>
      <Text style={styles.trustLabel}>{label}</Text>
      <Text style={styles.trustValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detailWrap: {
    position: "relative"
  },
  heroFrame: {
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
  photoCounter: {
    backgroundColor: "rgba(26,26,23,0.72)",
    borderRadius: 999,
    bottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    position: "absolute",
    right: spacing.md
  },
  photoCounterText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "900"
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
  trustSection: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  trustRow: {
    gap: spacing.xs
  },
  trustLabel: {
    color: colors.forest,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  trustValue: {
    color: colors.ink2,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21
  },
  descriptionSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.lg,
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
  claimedIcon: {
    alignItems: "center",
    backgroundColor: colors.dangerBg,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  claimedIconText: {
    color: colors.danger,
    fontSize: 22,
    fontWeight: "900"
  },
  claimedInterrupt: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    bottom: spacing.md,
    gap: spacing.md,
    left: 0,
    padding: spacing.lg,
    position: "absolute",
    right: 0,
    shadowColor: colors.ink,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 20
  },
  claimedInterruptActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  claimedInterruptBody: {
    flex: 1,
    gap: spacing.xs
  },
  claimedInterruptButton: {
    flex: 1
  },
  claimedInterruptHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  claimedInterruptText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  claimedInterruptTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
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
  },
  urgencyDot: {
    backgroundColor: "#E0982B",
    borderRadius: 999,
    height: 8,
    width: 8
  },
  urgencyStrip: {
    alignItems: "center",
    backgroundColor: colors.lowStockBg,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md
  },
  urgencyText: {
    color: colors.lowStock,
    flex: 1,
    fontSize: 13,
    fontWeight: "900"
  }
});
