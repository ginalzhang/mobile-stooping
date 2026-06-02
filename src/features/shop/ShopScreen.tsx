import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { fetchCollectionDetails, fetchProducts } from "../../api/shopify";
import { AppButton } from "../../components/AppButton";
import { BrandLogo } from "../../components/BrandLogo";
import { Chip } from "../../components/Chip";
import { ProductCard } from "../../components/ProductCard";
import { Screen } from "../../components/Screen";
import { StateView } from "../../components/StateView";
import { StoopyMascot } from "../../components/StoopyMascot";
import { colors } from "../../theme/colors";
import { spacing, typography } from "../../theme/theme";
import type { Product, ProductSort } from "../../types/product";
import type { ShopStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<ShopStackParamList, "ShopHome">;
type BrowseMode = "Grid" | "Collections" | "Stroll";

const sortOptions: { label: string; value: ProductSort }[] = [
  { label: "Recently added", value: "RECENTLY_ADDED" },
  { label: "Popular", value: "POPULAR" },
  { label: "A-Z", value: "TITLE_ASC" },
  { label: "Earlier", value: "EARLIER_LISTINGS" }
];

export function ShopScreen({ navigation }: Props) {
  const [mode, setMode] = useState<BrowseMode>("Grid");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [sort, setSort] = useState<ProductSort>("RECENTLY_ADDED");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [strollIndex, setStrollIndex] = useState(0);
  const [strolledIds, setStrolledIds] = useState<string[]>([]);

  const filters = { category, inStockOnly, search, sort };
  const productsQuery = useInfiniteQuery({
    queryKey: ["products", filters],
    queryFn: ({ pageParam }) => fetchProducts({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null
  });
  const collectionsQuery = useQuery({
    queryKey: ["collections"],
    queryFn: () => fetchCollectionDetails()
  });

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.products) ?? [],
    [productsQuery.data]
  );
  const usingCachedInventory = Boolean(
    productsQuery.data?.pages.some((page) => page.source === "cache")
  );
  const availableStrollProducts = useMemo(
    () => products.filter((product) => product.availableForSale && product.stockCount > 0),
    [products]
  );
  const strollProduct =
    availableStrollProducts[strollIndex % Math.max(availableStrollProducts.length, 1)];
  const strolledAllItems =
    mode === "Stroll" &&
    availableStrollProducts.length > 0 &&
    strolledIds.length >= availableStrollProducts.length;
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

  const header = (
    <View style={styles.header}>
      <BrandLogo size="medium" />
      {usingCachedInventory ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineTitle}>Offline mode</Text>
          <Text style={styles.offlineText}>
            Showing the last inventory we loaded. Pull back online before checkout.
          </Text>
        </View>
      ) : null}
      <Text style={typography.h1}>Free treasures, ready for a good home</Text>
      <Text style={styles.subhead}>Hot items move fast. Everything is $0.</Text>
      <View style={styles.modeRow}>
        {(["Grid", "Collections", "Stroll"] as BrowseMode[]).map((option) => (
          <Chip
            key={option}
            label={option}
            selected={mode === option}
            onPress={() => setMode(option)}
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel="Search inventory"
        autoCapitalize="none"
        onChangeText={setSearch}
        placeholder="Search inventory"
        placeholderTextColor={colors.muted}
        style={styles.search}
        value={search}
      />
      {mode === "Collections" ? (
        <>
          <FlatList
            horizontal
            data={[
              { handle: "", title: "All items" },
              ...(collectionsQuery.data?.collections ?? [])
            ]}
            keyExtractor={(item) => item.handle || "all"}
            renderItem={({ item }) => (
              <Chip
                label={item.title}
                selected={(!item.handle && !category) || category === item.handle}
                onPress={() => setCategory(item.handle || undefined)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
            showsHorizontalScrollIndicator={false}
          />
          <View style={styles.filterRow}>
            {sortOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={sort === option.value}
                onPress={() => setSort(option.value)}
              />
            ))}
          </View>
          <Chip
            label={inStockOnly ? "In stock only" : "All availability"}
            selected={inStockOnly}
            onPress={() => setInStockOnly((value) => !value)}
          />
        </>
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
            product={strollProduct}
            onNext={() => {
              setStrolledIds((ids) =>
                ids.includes(strollProduct.id) ? ids : [...ids, strollProduct.id]
              );
              setStrollIndex((index) => index + 1);
            }}
            onPress={() => openProduct(strollProduct)}
          />
        ) : (
          <StateView title="No items found" message="Try clearing filters." showMascot />
        )}
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
            message="Stoopy did not find a match. Try another search or category."
            showMascot
          />
        }
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => openProduct(item)} />
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

function StrollCard({
  product,
  onNext,
  onPress
}: {
  product: Product;
  onNext: () => void;
  onPress: () => void;
}) {
  const image = product.images[0];
  const descriptionStory = product.description.split(".")[0]?.trim();
  const story = descriptionStory
    ? `${descriptionStory}.`
    : product.category && product.category !== "Uncategorized"
      ? `${product.category} ready for a second life.`
      : "Stoopy found this second-life item for its next home.";

  return (
    <Pressable onPress={onPress} style={styles.strollCard}>
      {image ? (
        <Image source={{ uri: image }} style={styles.strollImage} resizeMode="cover" />
      ) : (
        <View style={[styles.strollImage, styles.imageFallback]}>
          <Text style={typography.h2}>$0</Text>
        </View>
      )}
      <View style={styles.strollBody}>
        <View style={styles.stoopyRow}>
          <StoopyMascot caption="" size="small" />
          <View style={styles.speechBubble}>
            <Text style={styles.speechTitle}>Stoopy found you something</Text>
            <Text style={styles.speechText}>
              One second-life item at a time. Keep strolling for the next find.
            </Text>
          </View>
        </View>
        <Text style={typography.h2}>{product.title}</Text>
        <Text style={styles.price}>$0.00</Text>
        <Text style={typography.body}>{story}</Text>
        <View style={styles.strollActions}>
          <AppButton label="View item" onPress={onPress} />
          <AppButton label="Next find" variant="secondary" onPress={onNext} />
        </View>
      </View>
    </Pressable>
  );
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
  subhead: {
    color: colors.forest,
    fontSize: 16,
    fontWeight: "700"
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  filterRow: {
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
  offlineBanner: {
    backgroundColor: colors.forest,
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
  strollCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  strollImage: {
    aspectRatio: 1,
    width: "100%"
  },
  imageFallback: {
    alignItems: "center",
    backgroundColor: "#ECE7DD",
    justifyContent: "center"
  },
  strollBody: {
    gap: spacing.sm,
    padding: spacing.lg
  },
  stoopyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  speechBubble: {
    backgroundColor: colors.cream,
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
  price: {
    color: colors.forest,
    fontSize: 24,
    fontWeight: "900"
  },
  strollActions: {
    gap: spacing.sm,
    marginTop: spacing.md
  }
});
