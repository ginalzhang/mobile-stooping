import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchProduct } from "../../api/shopify";
import { AppButton } from "../../components/AppButton";
import { Chip } from "../../components/Chip";
import { Screen } from "../../components/Screen";
import { StateView } from "../../components/StateView";
import { useCart } from "../cart/CartContext";
import { colors } from "../../theme/colors";
import { spacing, typography } from "../../theme/theme";
import type { ShopStackParamList } from "../../navigation/types";

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to shop"
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹ Shop</Text>
      </Pressable>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {product.images.length ? (
          product.images.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.heroImage} />
          ))
        ) : (
          <View style={[styles.heroImage, styles.imageFallback]}>
            <Text style={typography.h1}>$0</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.section}>
        <Text style={typography.h1}>{product.title}</Text>
        <Text style={styles.price}>$0.00</Text>
        <View style={styles.chips}>
          <Chip label={product.availableForSale ? `${product.stockCount || 1} in stock` : "Out of stock"} />
          <Chip label={product.condition} />
          <Chip label={product.category} />
        </View>
        <View style={styles.factRow}>
          <Text style={styles.factLabel}>Estimated retail value</Text>
          <Text style={styles.factValue}>{product.estimatedRetailValue}</Text>
        </View>
        <Text style={typography.body}>
          {product.description || "No description yet. This item is ready for reuse."}
        </Text>
        <AppButton
          label={product.availableForSale ? "Add to Order" : "Out of stock"}
          disabled={!product.availableForSale}
          onPress={onAdd}
        />
      </View>
      <View style={styles.policy}>
        <Text style={typography.h3}>Local Pickup Only</Text>
        <Text style={typography.body}>
          All items are available for local pickup only. Once your order is placed,
          Stooping Club will text and/or email pickup details.
        </Text>
        <Text style={typography.h3}>Image Editing & AI Use</Text>
        <Text style={typography.body}>
          Images may be edited with AI for clarity. All items are real.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    aspectRatio: 1,
    backgroundColor: "#ECE7DD",
    borderRadius: 8,
    marginRight: spacing.md,
    width: 340
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center"
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.lg
  },
  price: {
    color: colors.forest,
    fontSize: 28,
    fontWeight: "900"
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  factRow: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
  factLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  factValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  policy: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.lg
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.paper2,
    borderRadius: 999,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  backText: {
    color: colors.forest,
    fontSize: 15,
    fontWeight: "900"
  }
});
