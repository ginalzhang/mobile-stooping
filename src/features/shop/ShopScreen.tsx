import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
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
import { ORDER_LIMIT } from "../../constants/pickup";
import { useCart } from "../cart/CartContext";
import type { ShopStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { spacing, typography } from "../../theme/theme";
import type { Product } from "../../types/product";
import { StrollExperience } from "./stroll";

type Props = NativeStackScreenProps<ShopStackParamList, "ShopHome">;
type BrowseMode = "Grid" | "Collections" | "Stroll";

const modes: BrowseMode[] = ["Grid", "Collections", "Stroll"];

export function ShopScreen({ navigation }: Props) {
  const [mode, setMode] = useState<BrowseMode>("Grid");
  const [search, setSearch] = useState("");
  const { addItem, items, totalQuantity } = useCart();

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
  const cachedPage = productsQuery.data?.pages.find((page) => page.source === "cache");
  const availableProducts = useMemo(
    () => products.filter((product) => product.availableForSale && product.stockCount > 0),
    [products]
  );
  const collectionGroups = useMemo(() => groupProductsByCategory(products), [products]);
  const refreshControl = (
    <RefreshControl
      refreshing={productsQuery.isRefetching}
      onRefresh={() => void productsQuery.refetch()}
      tintColor={colors.forest}
    />
  );

  const openProduct = useCallback((product: Product) => {
    navigation.navigate("ProductDetail", {
      handle: product.handle,
      productId: product.id
    });
  }, [navigation]);

  const isInOrder = useCallback(
    (product: Product) =>
      items.some((item) => item.product.variantId === product.variantId),
    [items]
  );

  const reserveProduct = useCallback((product: Product) => {
    if (!product.variantId.trim()) {
      Alert.alert("Could not add item", "This find is missing checkout details.");
      return false;
    }

    if (!product.availableForSale || product.stockCount <= 0) {
      Alert.alert("Already claimed", "This find is no longer available.");
      return false;
    }

    if (totalQuantity >= ORDER_LIMIT) {
      Alert.alert("Order is full", `Orders are limited to ${ORDER_LIMIT} items.`);
      return false;
    }

    const quantityInCart = items
      .filter((item) => item.product.variantId === product.variantId)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (quantityInCart >= product.stockCount) {
      Alert.alert(
        "Already reserved",
        "You already added the available stock for this item."
      );
      return false;
    }

    const result = addItem(product);
    if (!result.ok) {
      Alert.alert("Could not add item", result.message ?? "Try another find.");
      return false;
    }

    return true;
  }, [addItem, items, totalQuantity]);

  const addProduct = useCallback((product: Product) => {
    reserveProduct(product);
  }, [reserveProduct]);

  const loadMoreStrollProducts = useCallback(() => {
    if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
      void productsQuery.fetchNextPage();
    }
  }, [
    productsQuery.fetchNextPage,
    productsQuery.hasNextPage,
    productsQuery.isFetchingNextPage
  ]);

  const header = (
    <View style={styles.header}>
      {usingCachedInventory ? (
        <OfflineInventoryBanner
          cacheAgeMs={cachedPage?.cacheAgeMs}
          compact={mode === "Stroll"}
        />
      ) : null}
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
            {availableProducts.length} free pickup-only finds available · new reuse drops
            move fast
          </Text>
        </>
      ) : null}
      <ModeSegment mode={mode} onChange={setMode} />
      {mode !== "Stroll" ? (
        <View style={styles.searchWrap}>
          <Text accessible={false} style={styles.searchIcon}>
            ⌕
          </Text>
          <TextInput
            accessibilityLabel="Search inventory"
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Search inventory"
            placeholderTextColor={colors.muted}
            style={styles.search}
            value={search}
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearch("")}
              style={styles.clearSearch}
            >
              <Text style={styles.clearSearchText}>×</Text>
            </Pressable>
          ) : null}
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
      <Screen scroll={false}>
        {header}
        <StrollExperience
          cartItems={items}
          hasNextPage={productsQuery.hasNextPage}
          onNeedMoreProducts={loadMoreStrollProducts}
          onOpenProduct={openProduct}
          onReserveProduct={reserveProduct}
          products={products}
          resetKey={search}
        />
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
            <NoResultsView search={search} />
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
          <NoResultsView search={search} />
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
      <View style={styles.shelfGrid}>
        {products.map((product) => (
          <View key={product.variantId} style={styles.shelfCardSlot}>
            <ProductCard
              inOrder={inOrder(product)}
              onAdd={() => onAdd(product)}
              onPress={() => onPress(product)}
              product={product}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function NoResultsView({ search }: { search?: string }) {
  const hasSearch = Boolean(search?.trim());
  return (
    <View style={styles.noResults}>
      <StoopyMascot
        caption=""
        containerStyle={styles.noResultsMascot}
        size="medium"
      />
      <Text style={styles.noResultsTitle}>
        {hasSearch ? "Nothing matches that search" : "No free finds available"}
      </Text>
      <Text style={styles.noResultsMessage}>
        {hasSearch
          ? "Try a different word or clear search. Inventory changes every week as new reusable finds come in."
          : "Everything currently listed has been claimed. Check back before the next Sunday pickup drop."}
      </Text>
    </View>
  );
}

function OfflineInventoryBanner({
  cacheAgeMs,
  compact
}: {
  cacheAgeMs?: number;
  compact?: boolean;
}) {
  const cacheAge = formatCacheAge(cacheAgeMs);

  return (
    <View style={[styles.offlineBanner, compact && styles.offlineBannerCompact]}>
      <Text style={styles.offlineTitle}>Offline - showing saved inventory</Text>
      {!compact ? (
        <Text style={styles.offlineText}>
          You can keep browsing saved free finds{cacheAge ? ` from ${cacheAge}` : ""}.
          Go online before checkout so stock, pickup status, and claimed items can be
          rechecked.
        </Text>
      ) : null}
    </View>
  );
}

function formatCacheAge(cacheAgeMs?: number) {
  if (typeof cacheAgeMs !== "number") return null;

  const minutes = Math.floor(cacheAgeMs / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
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
          accessibilityLabel={`Browse mode: ${option}`}
          accessibilityRole="tab"
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
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    paddingRight: spacing.lg
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingLeft: spacing.md
  },
  searchIcon: {
    color: colors.faint,
    fontSize: 20,
    fontWeight: "900",
    marginRight: spacing.sm
  },
  clearSearch: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  clearSearchText: {
    color: colors.faint,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28
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
    backgroundColor: colors.ink,
    borderRadius: 0,
    gap: spacing.xs,
    padding: spacing.md
  },
  offlineBannerCompact: {
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.md,
    paddingVertical: spacing.sm
  },
  offlineTitle: {
    color: colors.card,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center"
  },
  offlineText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 430,
    paddingHorizontal: spacing.xl
  },
  noResultsMascot: {
    alignSelf: "center",
    marginBottom: spacing.lg
  },
  noResultsTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    textAlign: "center"
  },
  noResultsMessage: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.sm,
    maxWidth: 280,
    textAlign: "center"
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
  shelfGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  shelfCardSlot: {
    flexBasis: "47%",
    flexGrow: 1,
    maxWidth: "48%"
  },
  loadMore: {
    marginTop: spacing.sm
  }
});
