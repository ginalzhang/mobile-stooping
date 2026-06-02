import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { fetchProducts } from "../../api/shopify";
import { AppButton } from "../../components/AppButton";
import { BrandLogo } from "../../components/BrandLogo";
import { ProductCard } from "../../components/ProductCard";
import { Screen } from "../../components/Screen";
import { StateView } from "../../components/StateView";
import { StoopyMascot } from "../../components/StoopyMascot";
import { useCart } from "../cart/CartContext";
import type { ShopStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { spacing, typography } from "../../theme/theme";
import type { Product } from "../../types/product";

type Props = NativeStackScreenProps<ShopStackParamList, "ShopHome">;
type BrowseMode = "Grid" | "Collections" | "Stroll";

const modes: BrowseMode[] = ["Grid", "Collections", "Stroll"];

export function ShopScreen({ navigation }: Props) {
  const [mode, setMode] = useState<BrowseMode>("Grid");
  const [search, setSearch] = useState("");
  const [strollIndex, setStrollIndex] = useState(0);
  const [strolledIds, setStrolledIds] = useState<string[]>([]);
  const { addItem, items } = useCart();

  const filters = useMemo(
    () => ({ inStockOnly: true, search, sort: "RECENTLY_ADDED" as const }),
    [search]
  );
  const productsQuery = useInfiniteQuery({
    queryKey: ["products", filters],
    queryFn: ({ pageParam }) => fetchProducts({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null
  });

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.products) ?? [],
    [productsQuery.data]
  );
  const usingCachedInventory = Boolean(
    productsQuery.data?.pages.some((page) => page.source === "cache")
  );
  const availableProducts = useMemo(
    () => products.filter((product) => product.availableForSale && product.stockCount > 0),
    [products]
  );
  const collectionGroups = useMemo(() => groupProductsByCategory(products), [products]);
  const strollProduct =
    availableProducts[strollIndex % Math.max(availableProducts.length, 1)];
  const strolledAllItems =
    mode === "Stroll" &&
    availableProducts.length > 0 &&
    strolledIds.length >= availableProducts.length;
  const refreshControl = (
    <RefreshControl
      refreshing={productsQuery.isRefetching}
      onRefresh={() => void productsQuery.refetch()}
      tintColor={colors.forest}
    />
  );

  const openProduct = (product: Product) => {
    navigation.navigate("ProductDetail", {
      handle: product.handle,
      productId: product.id
    });
  };

  const isInOrder = (product: Product) =>
    items.some((item) => item.product.variantId === product.variantId);

  const addProduct = (product: Product) => {
    const result = addItem(product);
    if (!result.ok) {
      Alert.alert("Could not add item", result.message ?? "Try another find.");
    }
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <BrandLogo size="medium" />
        {usingCachedInventory ? (
          <View style={styles.offlinePill}>
            <Text style={styles.offlinePillText}>Offline</Text>
          </View>
        ) : null}
      </View>
      {mode !== "Stroll" ? (
        <>
          <Text style={typography.h1}>Free treasures, ready{"\n"}for a good home</Text>
          <Text style={styles.subhead}>
            {availableProducts.length} finds available · hot items move fast
          </Text>
        </>
      ) : null}
      <ModeSegment mode={mode} onChange={setMode} />
      {mode !== "Stroll" ? (
        <TextInput
          accessibilityLabel="Search inventory"
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Search inventory"
          placeholderTextColor={colors.muted}
          style={styles.search}
          value={search}
        />
      ) : null}
      {usingCachedInventory && mode !== "Stroll" ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineTitle}>Showing saved inventory</Text>
          <Text style={styles.offlineText}>
            Pull back online before checkout so stock can be rechecked.
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (productsQuery.isLoading) {
    return (
      <Screen scroll={false}>
        {header}
        <StateView title="Loading free finds" loading />
      </Screen>
    );
  }

  if (productsQuery.isError) {
    return (
      <Screen>
        {header}
        <StateView
          title="Inventory could not load"
          message="Check the Storefront API env vars and network connection."
          actionLabel="Try again"
          onAction={() => void productsQuery.refetch()}
          showMascot
        />
      </Screen>
    );
  }

  if (mode === "Stroll") {
    return (
      <Screen>
        {header}
        {strolledAllItems ? (
          <StateView
            title="You strolled the whole block"
            message="Stoopy showed every available find in this view. New drops land before Sunday pickup."
            actionLabel="Start over"
            onAction={() => {
              setStrolledIds([]);
              setStrollIndex(0);
            }}
            showMascot
          />
        ) : strollProduct ? (
          <StrollCard
            inOrder={isInOrder(strollProduct)}
            onAdd={() => addProduct(strollProduct)}
            onNext={() => {
              setStrolledIds((ids) =>
                ids.includes(strollProduct.id) ? ids : [...ids, strollProduct.id]
              );
              setStrollIndex((index) => index + 1);
            }}
            onPress={() => openProduct(strollProduct)}
            product={strollProduct}
          />
        ) : (
          <StateView title="No items found" message="Try clearing search." showMascot />
        )}
      </Screen>
    );
  }

  if (mode === "Collections") {
    return (
      <Screen scroll={false}>
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {header}
          {collectionGroups.length ? (
            collectionGroups.map((group) => (
              <CollectionShelf
                inOrder={isInOrder}
                key={group.category}
                onAdd={addProduct}
                onPress={openProduct}
                products={group.products}
                title={group.category}
              />
            ))
          ) : (
            <StateView
              title="No items found"
              message="Stoopy did not find a match. Try another search."
              showMascot
            />
          )}
          {productsQuery.hasNextPage ? (
            <AppButton
              label="Load more finds"
              loading={productsQuery.isFetchingNextPage}
              onPress={() => void productsQuery.fetchNextPage()}
              style={styles.loadMore}
              variant="secondary"
            />
          ) : null}
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.variantId}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <StateView
            title="No items found"
            message="Stoopy did not find a match. Try another search."
            showMascot
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            inOrder={isInOrder(item)}
            onAdd={() => addProduct(item)}
            onPress={() => openProduct(item)}
            product={item}
          />
        )}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        refreshControl={refreshControl}
        onEndReached={() => {
          if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
            void productsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
      />
    </Screen>
  );
}

function CollectionShelf({
  inOrder,
  onAdd,
  onPress,
  products,
  title
}: {
  inOrder: (product: Product) => boolean;
  onAdd: (product: Product) => void;
  onPress: (product: Product) => void;
  products: Product[];
  title: string;
}) {
  return (
    <View style={styles.shelf}>
      <View style={styles.shelfHeader}>
        <Text style={styles.shelfTitle}>{title}</Text>
        <Text style={styles.shelfCount}>{products.length} finds</Text>
      </View>
      <ScrollView
        horizontal
        contentContainerStyle={styles.shelfRow}
        style={styles.shelfScroller}
        showsHorizontalScrollIndicator={false}
      >
        {products.map((product) => (
          <ProductCard
            inOrder={inOrder(product)}
            key={product.variantId}
            onAdd={() => onAdd(product)}
            onPress={() => onPress(product)}
            product={product}
            wide
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ModeSegment({
  mode,
  onChange
}: {
  mode: BrowseMode;
  onChange: (mode: BrowseMode) => void;
}) {
  return (
    <View style={styles.segment}>
      {modes.map((option) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === option }}
          key={option}
          onPress={() => onChange(option)}
          style={[styles.segmentOption, mode === option && styles.segmentSelected]}
        >
          <Text
            style={[
              styles.segmentLabel,
              mode === option && styles.segmentSelectedLabel
            ]}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function StrollCard({
  inOrder,
  onAdd,
  onNext,
  onPress,
  product
}: {
  inOrder: boolean;
  onAdd: () => void;
  onNext: () => void;
  onPress: () => void;
  product: Product;
}) {
  const image = product.images[0];
  const descriptionStory = product.description.split(".")[0]?.trim();
  const story = descriptionStory
    ? `${descriptionStory}.`
    : product.category && product.category !== "Uncategorized"
      ? `${product.category} ready for a second life.`
      : "Stoopy found this second-life item for its next home.";

  return (
    <View style={styles.strollCard}>
      <View style={styles.stoopyRow}>
        <StoopyMascot caption="" size="small" />
        <View style={styles.speechBubble}>
          <Text style={styles.speechTitle}>Stoopy found you something.</Text>
          <Text style={styles.speechText}>
            One second-life item at a time. Keep strolling for the next find.
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${product.title}`}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.strollImage} resizeMode="cover" />
        ) : (
          <View style={[styles.strollImage, styles.imageFallback]}>
            <Text style={typography.h2}>$0</Text>
          </View>
        )}
      </Pressable>
      <View style={styles.strollBody}>
        <Pressable onPress={onPress}>
          <Text style={typography.h2}>{product.title}</Text>
        </Pressable>
        <View style={styles.strollMetaRow}>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>$0</Text>
          </View>
          <View style={styles.categoryPill}>
            <Text numberOfLines={1} style={styles.categoryPillText}>
              {product.category}
            </Text>
          </View>
          <View style={styles.stockPill}>
            <Text style={styles.stockPillText}>
              {product.stockCount === 1 ? "Last one" : `${product.stockCount} left`}
            </Text>
          </View>
        </View>
        <View style={styles.originBox}>
          <Text style={styles.originLabel}>Origin story</Text>
          <Text style={styles.originText}>{story}</Text>
        </View>
        <View style={styles.strollActions}>
          <AppButton
            label="Next find"
            variant="secondary"
            onPress={onNext}
            style={styles.strollActionButton}
          />
          <AppButton
            disabled={inOrder}
            label={inOrder ? "In your order" : "Add to order"}
            onPress={onAdd}
            style={styles.strollActionButton}
            variant={inOrder ? "accent" : "primary"}
          />
        </View>
      </View>
    </View>
  );
}

function groupProductsByCategory(products: Product[]) {
  const groups = new Map<string, Product[]>();
  products.forEach((product) => {
    const category = product.category || "Other finds";
    const current = groups.get(category) ?? [];
    current.push(product);
    groups.set(category, current);
  });

  return Array.from(groups.entries())
    .map(([category, groupProducts]) => ({ category, products: groupProducts }))
    .sort((a, b) => b.products.length - a.products.length || a.category.localeCompare(b.category));
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  subhead: {
    color: colors.forest,
    fontSize: 15,
    fontWeight: "800"
  },
  segment: {
    backgroundColor: colors.paper2,
    borderRadius: 999,
    flexDirection: "row",
    padding: spacing.xs
  },
  segmentOption: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    minHeight: 40
  },
  segmentSelected: {
    backgroundColor: colors.forest
  },
  segmentLabel: {
    color: colors.ink2,
    fontSize: 14,
    fontWeight: "900"
  },
  segmentSelectedLabel: {
    color: colors.card
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  search: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  offlinePill: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  offlinePillText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "900"
  },
  offlineBanner: {
    backgroundColor: colors.forestDark,
    borderRadius: 8,
    gap: spacing.xs,
    padding: spacing.md
  },
  offlineTitle: {
    color: colors.lime,
    fontSize: 14,
    fontWeight: "900"
  },
  offlineText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  gridRow: {
    gap: spacing.md,
    marginBottom: spacing.md
  },
  shelf: {
    gap: spacing.md,
    marginBottom: spacing.xl
  },
  shelfHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  shelfTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 20,
    fontWeight: "900"
  },
  shelfCount: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  shelfRow: {
    alignItems: "flex-start",
    gap: spacing.md,
    paddingRight: spacing.lg
  },
  shelfScroller: {
    minHeight: 320
  },
  loadMore: {
    marginTop: spacing.sm
  },
  pressed: {
    opacity: 0.8
  },
  strollCard: {
    gap: spacing.md
  },
  strollImage: {
    aspectRatio: 1,
    backgroundColor: colors.paper2,
    borderRadius: 8,
    width: "100%"
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center"
  },
  strollBody: {
    gap: spacing.md
  },
  stoopyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  speechBubble: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md
  },
  speechTitle: {
    color: colors.forest,
    fontSize: 15,
    fontWeight: "900"
  },
  speechText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  strollMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  pricePill: {
    backgroundColor: colors.forest,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  pricePillText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: "900"
  },
  categoryPill: {
    backgroundColor: colors.paper2,
    borderRadius: 999,
    maxWidth: "55%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  categoryPillText: {
    color: colors.forest,
    fontSize: 13,
    fontWeight: "800"
  },
  stockPill: {
    backgroundColor: colors.lime,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  stockPillText: {
    color: colors.limeInk,
    fontSize: 13,
    fontWeight: "900"
  },
  originBox: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  originLabel: {
    color: colors.forest,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  originText: {
    color: colors.ink2,
    fontSize: 15,
    lineHeight: 21
  },
  strollActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  strollActionButton: {
    flex: 1
  }
});
