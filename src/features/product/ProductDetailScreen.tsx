import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
  const productQuery = useQuery({
    queryKey: ["product", productId, handle],
    queryFn: () => fetchProduct({ id: productId, handle })
  });

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
    Alert.alert("Added to order", "This free find is in your order.", [
      { text: "Keep browsing" },
      { text: "View order", onPress: () => navigation.getParent()?.navigate("Order") }
    ]);
  };

  return (
    <Screen>
      <View style={styles.heroFrame}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to shop"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {product.images.length ? (
            product.images.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={[styles.heroImage, !isAvailable && styles.claimedImage]}
              />
            ))
          ) : (
            <View style={[styles.heroImage, styles.imageFallback]}>
              <Text style={styles.placeholderIcon}>{category.slice(0, 2)}</Text>
              <Text style={styles.placeholderBrand}>STOOPING CLUB</Text>
            </View>
          )}
        </ScrollView>
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
            label={isAvailable ? `${product.stockCount || 1} in stock` : "Claimed"}
            tone={isAvailable ? "neutral" : "claimed"}
          />
          <DetailPill label={category} tone="neutral" />
        </View>
      </View>

      <View style={styles.pickupSection}>
        <Text style={styles.sectionLabel}>Pickup</Text>
        <Text style={typography.body}>
          {DEFAULT_PICKUP.window} at {DEFAULT_PICKUP.address}. Local pickup only, no
          delivery, no shipping.
        </Text>
      </View>

      {isAvailable ? (
        <AppButton label="Add to Order" onPress={onAdd} style={styles.bottomAction} />
      ) : (
        <View style={styles.claimedFooter}>
          <Text style={styles.claimedFooterText}>
            This one’s been claimed — keep strolling for more.
          </Text>
        </View>
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
    position: "relative"
  },
  heroImage: {
    aspectRatio: 1,
    backgroundColor: colors.paper2,
    borderRadius: 8,
    marginRight: spacing.md,
    width: 340
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
