import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  Alert,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  type ScrollViewProps,
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
import { requestNotificationPermission } from "../notifications/notificationUtils";
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
        <CollectionsBrowser
          groups={collectionGroups}
          header={header}
          inOrder={isInOrder}
          loadingMore={productsQuery.isFetchingNextPage}
          onAdd={addProduct}
          onLoadMore={() => void productsQuery.fetchNextPage()}
          onPress={openProduct}
          refreshControl={refreshControl}
          search={search}
          showLoadMore={Boolean(productsQuery.hasNextPage)}
        />
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

function CollectionsBrowser({
  groups,
  header,
  inOrder,
  loadingMore,
  onAdd,
  onLoadMore,
  onPress,
  refreshControl,
  search,
  showLoadMore
}: {
  groups: Array<{ category: string; products: Product[] }>;
  header: ReactNode;
  inOrder: (product: Product) => boolean;
  loadingMore: boolean;
  onAdd: (product: Product) => void;
  onLoadMore: () => void;
  onPress: (product: Product) => void;
  refreshControl: ScrollViewProps["refreshControl"];
  search?: string;
  showLoadMore: boolean;
}) {
  const scrollRef = useRef<ScrollView | null>(null);
  const chipScrollRef = useRef<ScrollView | null>(null);
  const programmaticScroll = useRef(false);
  const programmaticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const chipMetrics = useRef<Record<string, { width: number; x: number }>>({});
  const [activeCategory, setActiveCategory] = useState(groups[0]?.category ?? "");
  const [barHeight, setBarHeight] = useState(58);
  const [chipBarWidth, setChipBarWidth] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [visibleImageIds, setVisibleImageIds] = useState<Set<string>>(() => new Set());
  const categories = useMemo(
    () => groups.filter((group) => group.products.length > 0),
    [groups]
  );

  useEffect(() => {
    setActiveCategory((current) =>
      categories.some((group) => group.category === current)
        ? current
        : categories[0]?.category ?? ""
    );
  }, [categories]);

  useEffect(
    () => () => {
      if (programmaticTimer.current) clearTimeout(programmaticTimer.current);
    },
    []
  );

  const updateVisibleImages = useCallback((
    scrollY: number,
    viewportHeight: number
  ) => {
    if (!categories.length || !viewportHeight) return;
    const nextVisible = new Set<string>();
    const lower = scrollY - 220;
    const upper = scrollY + viewportHeight + 220;

    categories.forEach((group) => {
      const sectionTop = sectionOffsets.current[group.category] ?? 0;
      group.products.forEach((product, index) => {
        const row = Math.floor(index / 2);
        const estimatedTop = sectionTop + 58 + row * 318;
        const estimatedBottom = estimatedTop + 318;
        if (estimatedTop <= upper && estimatedBottom >= lower) {
          nextVisible.add(product.variantId);
        }
      });
    });

    setVisibleImageIds((current) => {
      let changed = false;
      nextVisible.forEach((id) => {
        if (!current.has(id)) changed = true;
      });
      if (!changed) return current;
      return new Set([...current, ...nextVisible]);
    });
  }, [categories]);

  const centerChip = useCallback((category: string) => {
    const metric = chipMetrics.current[category];
    if (!metric || !chipBarWidth) return;
    chipScrollRef.current?.scrollTo({
      animated: true,
      x: Math.max(0, metric.x - chipBarWidth / 2 + metric.width / 2)
    });
  }, [chipBarWidth]);

  useEffect(() => {
    if (activeCategory) centerChip(activeCategory);
  }, [activeCategory, centerChip]);

  const onScroll = useCallback((
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const viewportHeight = event.nativeEvent.layoutMeasurement.height;
    setShowTop(scrollY > 480);
    updateVisibleImages(scrollY, viewportHeight);

    if (programmaticScroll.current || !categories.length) return;
    const anchorY = scrollY + barHeight + 80;
    let nextCategory = categories[0].category;

    categories.forEach((group) => {
      const offset = sectionOffsets.current[group.category];
      if (typeof offset === "number" && offset <= anchorY) {
        nextCategory = group.category;
      }
    });
    setActiveCategory((current) =>
      current === nextCategory ? current : nextCategory
    );
  }, [barHeight, categories, updateVisibleImages]);

  const jumpToCategory = useCallback((category: string) => {
    const offset = sectionOffsets.current[category];
    if (typeof offset !== "number") return;

    setActiveCategory(category);
    programmaticScroll.current = true;
    if (programmaticTimer.current) clearTimeout(programmaticTimer.current);
    scrollRef.current?.scrollTo({
      animated: true,
      y: Math.max(0, offset - barHeight)
    });
    programmaticTimer.current = setTimeout(() => {
      programmaticScroll.current = false;
    }, 620);
  }, [barHeight]);

  if (!categories.length) {
    return (
      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        {header}
        <NoResultsView search={search} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.collectionsWrap}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => updateVisibleImages(0, 740)}
        onLayout={(event) =>
          updateVisibleImages(0, event.nativeEvent.layout.height)
        }
        onScroll={onScroll}
        refreshControl={refreshControl}
        scrollEventThrottle={16}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.list}>{header}</View>
        <View
          onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}
          style={styles.collectionChipDock}
        >
          <ScrollView
            ref={chipScrollRef}
            contentContainerStyle={styles.collectionChipList}
            horizontal
            onLayout={(event) => setChipBarWidth(event.nativeEvent.layout.width)}
            showsHorizontalScrollIndicator={false}
          >
            {categories.map((group) => {
              const selected = group.category === activeCategory;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={group.category}
                  onLayout={(event) => {
                    chipMetrics.current[group.category] = {
                      width: event.nativeEvent.layout.width,
                      x: event.nativeEvent.layout.x
                    };
                  }}
                  onPress={() => jumpToCategory(group.category)}
                  style={[
                    styles.collectionChip,
                    selected && styles.collectionChipActive
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.collectionChipText,
                      selected && styles.collectionChipTextActive
                    ]}
                  >
                    {group.category}
                  </Text>
                  <Text
                    style={[
                      styles.collectionChipCount,
                      selected && styles.collectionChipCountActive
                    ]}
                  >
                    {group.products.length}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <View style={styles.collectionSections}>
          {categories.map((group) => (
            <View
              key={group.category}
              onLayout={(event) => {
                sectionOffsets.current[group.category] = event.nativeEvent.layout.y;
              }}
              style={styles.collectionSection}
            >
              <View style={styles.shelfHeader}>
                <Text style={styles.shelfTitle}>{group.category}</Text>
                <Text style={styles.shelfCount}>
                  {group.products.length} {group.products.length === 1 ? "find" : "finds"}
                </Text>
              </View>
              <View style={styles.shelfGrid}>
                {group.products.map((product) => (
                  <View key={product.variantId} style={styles.shelfCardSlot}>
                    <ProductCard
                      imageVisible={visibleImageIds.has(product.variantId)}
                      inOrder={inOrder(product)}
                      lazyImage
                      onAdd={() => onAdd(product)}
                      onPress={() => onPress(product)}
                      product={product}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
          {showLoadMore ? (
            <AppButton
              label="Load more finds"
              loading={loadingMore}
              onPress={onLoadMore}
              style={styles.loadMore}
              variant="secondary"
            />
          ) : null}
        </View>
      </ScrollView>
      {showTop ? (
        <Pressable
          accessibilityLabel="Back to top"
          accessibilityRole="button"
          onPress={() => scrollRef.current?.scrollTo({ animated: true, y: 0 })}
          style={styles.backToTop}
        >
          <Text style={styles.backToTopText}>Top</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function NoResultsView({ search }: { search?: string }) {
  const hasSearch = Boolean(search?.trim());
  if (!hasSearch) return <BetweenDropsView />;

  return (
    <View style={styles.noResults}>
      <StoopyMascot
        caption=""
        containerStyle={styles.noResultsMascot}
        size="medium"
      />
      <Text style={styles.noResultsTitle}>
        Nothing matches that search
      </Text>
      <Text style={styles.noResultsMessage}>
        Try a different word or clear search. Inventory changes every week as new
        reusable finds come in.
      </Text>
    </View>
  );
}

function BetweenDropsView() {
  const [secondsToDrop, setSecondsToDrop] = useState(getSecondsToNextDrop());
  const [notify, setNotify] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsToDrop(Math.max(0, getSecondsToNextDrop()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const days = Math.floor(secondsToDrop / 86400);
  const hours = Math.floor((secondsToDrop % 86400) / 3600);
  const minutes = Math.floor((secondsToDrop % 3600) / 60);
  const seconds = secondsToDrop % 60;
  const toggleNotify = async () => {
    if (notifyBusy) return;

    setNotifyBusy(true);
    try {
      if (notify) {
        await Notifications.cancelScheduledNotificationAsync(
          "stooping-next-drop-reminder"
        );
        setNotify(false);
        return;
      }

      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        Alert.alert(
          "Notifications are off",
          "You can still check back Sunday at 2 PM for the next drop."
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: "stooping-next-drop-reminder",
        content: {
          title: "Stooping Club drop is live",
          body: "Fresh free reuse finds are landing now. Open the shop before they move.",
          sound: "default"
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: getNextDropDate()
        }
      });
      setNotify(true);
    } finally {
      setNotifyBusy(false);
    }
  };

  return (
    <View style={styles.betweenDrops}>
      <StoopyMascot caption="" containerStyle={styles.betweenDropsMascot} size="large" />
      <Text style={styles.noResultsTitle}>The curb's clear right now</Text>
      <Text style={styles.noResultsMessage}>
        Every find from the last drop found a home. Fresh reuse drops land Sunday
        at 2 PM, and Stoopy is already scouting.
      </Text>
      <View style={styles.countdownRow}>
        <CountdownUnit label="DAYS" value={days} />
        <CountdownUnit label="HRS" value={hours} />
        <CountdownUnit label="MIN" value={minutes} />
        <CountdownUnit label="SEC" value={seconds} />
      </View>
      <AppButton
        label={notify ? "You'll be first to know" : "Notify me when it drops"}
        loading={notifyBusy}
        onPress={toggleNotify}
        style={styles.notifyButton}
        variant={notify ? "accent" : "primary"}
      />
      <Text style={styles.notifyFinePrint}>One local reminder. No spam.</Text>
    </View>
  );
}

function CountdownUnit({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.countdownUnit}>
      <Text style={styles.countdownValue}>{String(value).padStart(2, "0")}</Text>
      <Text style={styles.countdownLabel}>{label}</Text>
    </View>
  );
}

function getSecondsToNextDrop() {
  const nextDrop = getNextDropDate();
  return Math.max(0, Math.floor((nextDrop.getTime() - Date.now()) / 1000));
}

function getNextDropDate() {
  const now = new Date();
  const nextDrop = new Date(now);
  const day = nextDrop.getDay();
  let daysUntilSunday = (7 - day) % 7;
  nextDrop.setHours(14, 0, 0, 0);

  if (daysUntilSunday === 0 && nextDrop <= now) {
    daysUntilSunday = 7;
  }

  nextDrop.setDate(nextDrop.getDate() + daysUntilSunday);
  return nextDrop;
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
  betweenDrops: {
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
    minHeight: 540,
    paddingHorizontal: spacing.lg
  },
  betweenDropsMascot: {
    alignSelf: "center"
  },
  backToTop: {
    alignItems: "center",
    backgroundColor: colors.forest,
    borderRadius: 999,
    bottom: spacing.lg,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    position: "absolute",
    right: spacing.lg,
    shadowColor: colors.ink,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10
  },
  backToTopText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: "900"
  },
  collectionChip: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md
  },
  collectionChipActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest
  },
  collectionChipCount: {
    color: colors.ink2,
    fontSize: 12,
    fontWeight: "900",
    opacity: 0.55
  },
  collectionChipCountActive: {
    color: colors.card,
    opacity: 0.82
  },
  collectionChipDock: {
    backgroundColor: "rgba(244,241,232,0.96)",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
    zIndex: 20
  },
  collectionChipList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg
  },
  collectionChipText: {
    color: colors.ink2,
    fontSize: 14,
    fontWeight: "900",
    maxWidth: 150
  },
  collectionChipTextActive: {
    color: colors.card
  },
  collectionSections: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl
  },
  collectionSection: {
    gap: spacing.md,
    marginBottom: spacing.xl
  },
  collectionsWrap: {
    flex: 1,
    minHeight: 0,
    position: "relative"
  },
  countdownLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center"
  },
  countdownRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.sm
  },
  countdownUnit: {
    alignItems: "center",
    gap: spacing.xs
  },
  countdownValue: {
    backgroundColor: colors.card,
    borderRadius: 12,
    color: colors.ink,
    fontSize: 25,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    minWidth: 58,
    paddingVertical: spacing.sm,
    textAlign: "center"
  },
  notifyButton: {
    marginTop: spacing.sm,
    minWidth: 270
  },
  notifyFinePrint: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
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
