import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import Animated, {
  BounceIn,
  BounceInRight,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOut,
  FadeOutLeft,
  FadeInUp,
  LinearTransition,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";

import { fetchProducts } from "../../api/shopify";
import { AppButton } from "../../components/AppButton";
import { BrandLogo } from "../../components/BrandLogo";
import { Chip } from "../../components/Chip";
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
type BrowseMode = "Browse" | "Stroll";

const modes: BrowseMode[] = ["Browse", "Stroll"];
const searchResetStyle = {
  outlineColor: "transparent",
  outlineStyle: "solid",
  outlineWidth: 0
} as const;

export function ShopScreen({ navigation }: Props) {
  const [mode, setMode] = useState<BrowseMode>("Browse");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderToast, setOrderToast] = useState<{ id: number; message: string } | null>(null);
  const [strollQueue, setStrollQueue] = useState<string[]>([]);
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
    initialPageParam: null as string | null,
    placeholderData: keepPreviousData
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
  const categoryOptions = useMemo(() => {
    const categories = new Set(
      products
        .map((product) => product.category)
        .filter((category): category is string => Boolean(category))
    );
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [products]);
  const visibleProducts = useMemo(
    () =>
      selectedCategory
        ? products.filter((product) => product.category === selectedCategory)
        : products,
    [products, selectedCategory]
  );
  const visibleAvailableCount = useMemo(
    () =>
      visibleProducts.filter(
        (product) => product.availableForSale && product.stockCount > 0
      ).length,
    [visibleProducts]
  );
  const strollProduct = useMemo(() => {
    const queuedId = strollQueue[0];
    return (
      availableProducts.find((product) => product.id === queuedId) ??
      availableProducts[0]
    );
  }, [availableProducts, strollQueue]);
  const strolledAllItems =
    mode === "Stroll" &&
    availableProducts.length > 0 &&
    strolledIds.length >= availableProducts.length;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchText.trim());
    }, 280);

    return () => clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    if (!availableProducts.length) {
      setStrollQueue([]);
      setStrolledIds([]);
      return;
    }

    setStrollQueue((currentQueue) => {
      const availableIds = new Set(availableProducts.map((product) => product.id));
      const validQueue = currentQueue.filter((id) => availableIds.has(id));
      if (validQueue.length) return validQueue;
      return shuffle(availableProducts.map((product) => product.id));
    });
    setStrolledIds((ids) => {
      const availableIds = new Set(availableProducts.map((product) => product.id));
      return ids.filter((id) => availableIds.has(id));
    });
  }, [availableProducts]);

  useEffect(() => {
    if (!selectedCategory) return;
    if (categoryOptions.includes(selectedCategory)) return;
    setSelectedCategory(null);
  }, [categoryOptions, selectedCategory]);

  useEffect(() => {
    if (!orderToast) return;
    const timeout = setTimeout(() => setOrderToast(null), 2400);
    return () => clearTimeout(timeout);
  }, [orderToast]);

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
      return;
    }
    setOrderToast({
      id: Date.now(),
      message: `${product.title} reserved`
    });
  };

  const header = (
    <View style={styles.header}>
      {usingCachedInventory ? <OfflineInventoryBanner compact={mode === "Stroll"} /> : null}
      <View style={styles.brandRow}>
        <BrandLogo size="medium" />
        {usingCachedInventory ? (
          <View style={styles.offlinePill}>
            <Text style={styles.offlinePillText}>Offline</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.headerCopy}>
        <Text style={typography.h1}>Free treasures, ready{"\n"}for a good home</Text>
        <Text style={styles.subhead}>
          {mode === "Stroll"
            ? "One find at a time · keep strolling for the next pick"
            : productsQuery.isLoading
              ? "Loading latest finds"
              : `${visibleAvailableCount} finds available · hot items move fast`}
        </Text>
      </View>
      <ModeSegment mode={mode} onChange={setMode} />
      <View style={styles.modeControls}>
        {mode !== "Stroll" ? (
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              accessibilityLabel="Search inventory"
              autoCapitalize="none"
              autoCorrect={false}
              cursorColor={colors.forest}
              onChangeText={setSearchText}
              placeholder="Search inventory"
              placeholderTextColor={colors.muted}
              selectionColor={colors.forest}
              style={[styles.search, searchResetStyle]}
              underlineColorAndroid="transparent"
              value={searchText}
            />
            {searchText ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => {
                  setSearchText("");
                  setSearch("");
                }}
                style={styles.clearSearch}
              >
                <Text style={styles.clearSearchText}>×</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Animated.View
            entering={BounceInRight.delay(120).duration(720)}
            style={styles.strollModeBubble}
          >
            <Text style={styles.strollModeTitle}>Stoopy is picking for you.</Text>
            <Text style={styles.strollModeText}>
              A slower one-at-a-time browse, with no search needed.
            </Text>
          </Animated.View>
        )}
        <View style={styles.categorySlot}>
          {mode !== "Stroll" && categoryOptions.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              <Chip
                label="All"
                onPress={() => setSelectedCategory(null)}
                selected={!selectedCategory}
              />
              {categoryOptions.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  onPress={() => setSelectedCategory(category)}
                  selected={selectedCategory === category}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
      {orderToast ? (
        <OrderToast
          key={orderToast.id}
          message={orderToast.message}
          onViewOrder={() => navigation.getParent()?.navigate("Order")}
        />
      ) : null}
    </View>
  );

  if (productsQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <FlatList
          data={[0, 1, 2, 3, 4, 5]}
          keyExtractor={(item) => `skeleton-${item}`}
          ListHeaderComponent={header}
          renderItem={({ index }) => <ProductSkeleton animationIndex={index} />}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.list}
        />
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
              setStrollQueue(shuffle(availableProducts.map((product) => product.id)));
            }}
            showMascot
          />
        ) : strollProduct ? (
          <StrollCard
            key={strollProduct.id}
            inOrder={isInOrder(strollProduct)}
            onAdd={() => addProduct(strollProduct)}
            onNext={() => {
              setStrolledIds((ids) =>
                ids.includes(strollProduct.id) ? ids : [...ids, strollProduct.id]
              );
              setStrollQueue((queue) => {
                const remaining = queue.filter((id) => id !== strollProduct.id);
                return remaining.length
                  ? remaining
                  : shuffle(
                      availableProducts
                        .filter((product) => product.id !== strollProduct.id)
                        .map((product) => product.id)
                    );
              });
            }}
            onPress={() => openProduct(strollProduct)}
            product={strollProduct}
          />
        ) : (
          <NoResultsView />
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item.variantId}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <NoResultsView />
        }
        renderItem={({ item, index }) => (
          <ProductCard
            animationIndex={index}
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

function OrderToast({
  message,
  onViewOrder
}: {
  message: string;
  onViewOrder: () => void;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(120)}
      style={styles.orderToast}
    >
      <Text numberOfLines={1} style={styles.orderToastText}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View order"
        onPress={onViewOrder}
        style={styles.orderToastAction}
      >
        <Text style={styles.orderToastActionText}>View</Text>
      </Pressable>
    </Animated.View>
  );
}

function ProductSkeleton({ animationIndex }: { animationIndex: number }) {
  const opacity = useSharedValue(0.55);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, {
          duration: 680,
          easing: Easing.inOut(Easing.quad)
        }),
        withTiming(0.55, {
          duration: 680,
          easing: Easing.inOut(Easing.quad)
        })
      ),
      -1,
      true
    );
  }, [opacity]);

  return (
    <Animated.View
      entering={FadeInDown.delay(animationIndex * 35).duration(220)}
      style={styles.skeletonCard}
    >
      <Animated.View style={[styles.skeletonImage, animatedStyle]} />
      <Animated.View style={[styles.skeletonLine, styles.skeletonTitle, animatedStyle]} />
      <Animated.View style={[styles.skeletonLine, styles.skeletonMeta, animatedStyle]} />
      <Animated.View style={[styles.skeletonButton, animatedStyle]} />
    </Animated.View>
  );
}

function NoResultsView() {
  return (
    <View style={styles.noResults}>
      <StoopyMascot
        caption=""
        containerStyle={styles.noResultsMascot}
        size="medium"
      />
      <Text style={styles.noResultsTitle}>Nothing matches that</Text>
      <Text style={styles.noResultsMessage}>
        Try a different word — inventory changes every week as new finds come in.
      </Text>
    </View>
  );
}

function OfflineInventoryBanner({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.offlineBanner, compact && styles.offlineBannerCompact]}>
      <Text style={styles.offlineTitle}>Offline — showing your saved inventory</Text>
      {!compact ? (
        <Text style={styles.offlineText}>
          You can keep browsing and strolling saved finds. Go online before checkout so
          stock can be rechecked.
        </Text>
      ) : null}
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
  const condition = product.condition || "Good used condition";

  return (
    <Animated.View
      entering={FadeInRight.duration(520)}
      exiting={FadeOutLeft.duration(220)}
      layout={LinearTransition.duration(260)}
      style={styles.strollCard}
    >
      <View style={styles.stoopyRow}>
        <Animated.View entering={BounceIn.delay(160).duration(760)}>
          <StoopyMascot caption="" size="small" />
        </Animated.View>
        <Animated.View
          entering={BounceInRight.delay(430).duration(760)}
          style={styles.speechBubble}
        >
          <Animated.Text
            entering={FadeIn.delay(880).duration(520)}
            style={styles.speechTitle}
          >
            Stoopy found you something.
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.delay(1080).duration(560)}
            style={styles.speechText}
          >
            One second-life item at a time. Keep strolling for the next find.
          </Animated.Text>
        </Animated.View>
      </View>
      <Animated.View
        entering={ZoomIn.delay(620).duration(680)}
        style={styles.strollImageStage}
      >
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
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(920).duration(560)} style={styles.strollBody}>
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
        <View style={styles.conditionBox}>
          <Text style={styles.conditionLabel}>Condition</Text>
          <Text style={styles.conditionText}>{condition}</Text>
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
            label={inOrder ? "Reserved" : "Reserve"}
            onPress={onAdd}
            style={styles.strollActionButton}
            variant={inOrder ? "accent" : "primary"}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function shuffle<T>(items: T[]) {
  const nextItems = [...items];
  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }
  return nextItems;
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
  headerCopy: {
    gap: spacing.md
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
  modeControls: {
    gap: spacing.sm,
    minHeight: 96
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
  categorySlot: {
    minHeight: 36
  },
  categoryRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg
  },
  strollModeBubble: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  strollModeTitle: {
    color: colors.forest,
    fontSize: 14,
    fontWeight: "900"
  },
  strollModeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  orderToast: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  orderToastText: {
    color: colors.card,
    flex: 1,
    fontSize: 13,
    fontWeight: "800"
  },
  orderToastAction: {
    backgroundColor: colors.lime,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  orderToastActionText: {
    color: colors.limeInk,
    fontSize: 13,
    fontWeight: "900"
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
  skeletonCard: {
    flex: 1
  },
  skeletonImage: {
    aspectRatio: 1,
    backgroundColor: colors.paper2,
    borderRadius: 8,
    width: "100%"
  },
  skeletonLine: {
    backgroundColor: colors.paper2,
    borderRadius: 999
  },
  skeletonTitle: {
    height: 16,
    marginTop: spacing.md,
    width: "88%"
  },
  skeletonMeta: {
    height: 14,
    marginTop: spacing.sm,
    width: "48%"
  },
  skeletonButton: {
    backgroundColor: colors.paper2,
    borderRadius: 8,
    height: 40,
    marginTop: spacing.md,
    width: "100%"
  },
  pressed: {
    opacity: 0.8
  },
  strollCard: {
    gap: spacing.md
  },
  strollImageStage: {
    width: "100%"
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
  conditionBox: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  conditionLabel: {
    color: colors.forest,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  conditionText: {
    color: colors.ink2,
    fontSize: 15,
    fontWeight: "800",
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
