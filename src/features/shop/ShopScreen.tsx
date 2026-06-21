import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { fetchProducts } from "../../api/shopify";
import { AppButton } from "../../components/AppButton";
import { BrandLogo } from "../../components/BrandLogo";
import { OrderFullButton, OrderFullToast } from "../../components/OrderFullNotice";
import { ProductCard } from "../../components/ProductCard";
import { Screen } from "../../components/Screen";
import { StateView } from "../../components/StateView";
import { StoopyMascot } from "../../components/StoopyMascot";
import { ORDER_LIMIT } from "../../constants/pickup";
import { useCart } from "../cart/CartContext";
import type { ShopStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { radii, spacing, typography } from "../../theme/theme";
import type { Product } from "../../types/product";
import {
  DailyCompleteOverlay,
  StrollGoalHeader,
  StrollScene,
  type SpeechTone,
  type StrollMood
} from "./components/StrollExperience";

type Props = NativeStackScreenProps<ShopStackParamList, "ShopHome">;
type BrowseMode = "Grid" | "Collections" | "Stroll";

const modes: BrowseMode[] = ["Grid", "Collections", "Stroll"];
const DAILY_STROLL_TARGET = 10;
const STROLL_STREAK_KEY = "stooping.stroll.streak.v1";
const STROLL_LINES = [
  "Next one's down the block.",
  "Ooh, keep strolling.",
  "Found another for you.",
  "One more curb to check.",
  "Stooped this one just now."
];
const RESERVE_LINES = [
  "It's yours. Nice grab.",
  "Reserved - see you Sunday.",
  "Good eye. Saved for you.",
  "That one's off the curb."
];
type StrollStreakState = {
  streakCount: number;
  lastCompletedDate: string | null;
};

export function ShopScreen({ navigation }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const [mode, setMode] = useState<BrowseMode>("Grid");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [strollQueue, setStrollQueue] = useState<string[]>([]);
  const [strolledIds, setStrolledIds] = useState<string[]>([]);
  const [dailyStrollCount, setDailyStrollCount] = useState(0);
  const [dailyDone, setDailyDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [lastCompletedDate, setLastCompletedDate] = useState<string | null>(null);
  const [stoopyMood, setStoopyMood] = useState<StrollMood>("walk");
  const [speech, setSpeech] = useState<{
    text: string;
    tone: SpeechTone;
  }>({ text: "Stoopy found you something.", tone: "neutral" });
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [orderFullToastVisible, setOrderFullToastVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dailyGoalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderFullTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addItem, items, totalQuantity } = useCart();

  const filters = useMemo(
    () => ({
      inStockOnly: true,
      search,
      sort: "RECENTLY_ADDED" as const
    }),
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
  const gridProducts = useMemo(
    () =>
      categoryFilter
        ? products.filter((product) => product.category === categoryFilter)
        : products,
    [categoryFilter, products]
  );
  const collectionGroups = useMemo(() => groupProductsByCategory(products), [products]);
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
  const dailyGoal = Math.min(DAILY_STROLL_TARGET, availableProducts.length);
  const displayedStreak = getDisplayStreak({ streakCount: streak, lastCompletedDate });
  const compactStroll = windowHeight <= 720;
  const strollImageMaxHeight = Math.max(
    104,
    Math.min(compactStroll ? 136 : 220, windowHeight * (compactStroll ? 0.18 : 0.26))
  );
  const orderFull = totalQuantity >= ORDER_LIMIT;
  useEffect(() => {
    if (!availableProducts.length) {
      setStrollQueue([]);
      setStrolledIds([]);
      setDailyStrollCount(0);
      setDailyDone(false);
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
    if (dailyGoal > 0 && dailyStrollCount > dailyGoal) {
      setDailyStrollCount(dailyGoal);
    }
  }, [dailyGoal, dailyStrollCount]);

  useEffect(() => {
    let mounted = true;
    void loadStrollStreak().then((storedStreak) => {
      if (!mounted) return;
      setLastCompletedDate(storedStreak.lastCompletedDate);
      setStreak(getDisplayStreak(storedStreak));
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReducedMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
      if (dailyGoalTimerRef.current) clearTimeout(dailyGoalTimerRef.current);
      if (orderFullTimerRef.current) clearTimeout(orderFullTimerRef.current);
    };
  }, []);
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

  const handleModeChange = (nextMode: BrowseMode) => {
    if (nextMode !== "Grid") {
      setCategoryFilter(null);
    }
    setMode(nextMode);
  };

  const openCollection = (category: string) => {
    setSearch("");
    setCategoryFilter(category);
    setMode("Grid");
  };

  const isInOrder = (product: Product) =>
    items.some((item) => item.product.variantId === product.variantId);

  const addProduct = (product: Product) => {
    const result = addItem(product);
    if (!result.ok) {
      if (result.reason === "order_limit") {
        showOrderFullToast();
        return false;
      }
      Alert.alert("Could not add item", result.message ?? "Try another find.");
    }
    return result.ok;
  };

  const showOrderFullToast = () => {
    if (orderFullTimerRef.current) clearTimeout(orderFullTimerRef.current);
    setOrderFullToastVisible(true);
    orderFullTimerRef.current = setTimeout(() => {
      setOrderFullToastVisible(false);
      orderFullTimerRef.current = null;
    }, 2500);
  };

  const openOrderTab = () => {
    if (orderFullTimerRef.current) clearTimeout(orderFullTimerRef.current);
    setOrderFullToastVisible(false);
    navigation.getParent()?.navigate("Order", { screen: "OrderHome" });
  };

  const resetMoodLater = (delay = 900) => {
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    moodTimerRef.current = setTimeout(() => {
      setStoopyMood("walk");
      moodTimerRef.current = null;
    }, delay);
  };

  const updateDailyStreak = async () => {
    const storedStreak = await loadStrollStreak();
    const today = getLocalDateKey();
    const yesterday = getLocalDateKey(new Date(Date.now() - 864e5));
    let nextStreak = storedStreak.streakCount;

    if (storedStreak.lastCompletedDate === today) {
      nextStreak = storedStreak.streakCount;
    } else if (storedStreak.lastCompletedDate === yesterday) {
      nextStreak = storedStreak.streakCount + 1;
    } else {
      nextStreak = 1;
    }

    const nextStreakState = {
      streakCount: nextStreak,
      lastCompletedDate: today
    };
    setStreak(nextStreak);
    setLastCompletedDate(today);
    try {
      await AsyncStorage.setItem(STROLL_STREAK_KEY, JSON.stringify(nextStreakState));
    } catch {
      // Keep the in-memory streak responsive even if local storage is temporarily unavailable.
    }
  };

  const celebrateDailyGoal = async () => {
    await updateDailyStreak();
    setStoopyMood("cheer");
    setCelebrationKey(Date.now());
    setDailyDone(true);
  };

  const recordDailyStroll = () => {
    if (dailyGoal <= 0) return;
    setDailyStrollCount((currentCount) => {
      const nextCount = Math.min(currentCount + 1, dailyGoal);
      if (nextCount >= dailyGoal && !dailyDone) {
        if (dailyGoalTimerRef.current) clearTimeout(dailyGoalTimerRef.current);
        dailyGoalTimerRef.current = setTimeout(() => {
          void celebrateDailyGoal();
          dailyGoalTimerRef.current = null;
        }, reducedMotion ? 0 : 220);
      }
      return nextCount;
    });
  };

  const handleStrollOn = (product: Product) => {
    recordDailyStroll();
    setStrolledIds((ids) =>
      ids.includes(product.id) ? ids : [...ids, product.id]
    );
    setStrollQueue((queue) => {
      const remaining = queue.filter((id) => id !== product.id);
      return remaining.length
        ? remaining
        : shuffle(
            availableProducts
              .filter((availableProduct) => availableProduct.id !== product.id)
              .map((availableProduct) => availableProduct.id)
          );
    });
    setStoopyMood("wave");
    setSpeech({ text: pickRandom(STROLL_LINES), tone: "skip" });
    resetMoodLater(700);
  };

  const handleStrollAdd = (product: Product) => {
    const added = addProduct(product);
    if (!added) return;
    setStoopyMood("cheer");
    setSpeech({ text: pickRandom(RESERVE_LINES), tone: "cheer" });
    setCelebrationKey(Date.now());
    resetMoodLater(1100);
    return true;
  };

  const handleOrderFullPress = () => {
    setStoopyMood("wave");
    setSpeech({ text: "Your bag's full — drop one to grab this.", tone: "skip" });
    showOrderFullToast();
    resetMoodLater(1200);
  };

  const continueDailyStroll = () => {
    setDailyDone(false);
    setDailyStrollCount(0);
    setStoopyMood("walk");
    setSpeech({ text: "Fresh block, fresh finds.", tone: "neutral" });
  };

  const header = (
    <View style={[styles.header, mode === "Stroll" && styles.strollHeader]}>
      {usingCachedInventory ? <OfflineInventoryBanner compact={mode === "Stroll"} /> : null}
      <View style={styles.brandRow}>
        <BrandLogo size={mode === "Stroll" && compactStroll ? "small" : "medium"} />
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
      <ModeSegment mode={mode} onChange={handleModeChange} />
      {mode !== "Stroll" ? (
        <>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
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
          {mode === "Grid" && categoryFilter ? (
            <View style={styles.activeCategory}>
              <Text numberOfLines={1} style={styles.activeCategoryText}>
                {categoryFilter}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setCategoryFilter(null)}
                style={styles.activeCategoryClear}
              >
                <Text style={styles.activeCategoryClearText}>Clear</Text>
              </Pressable>
            </View>
          ) : null}
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
      <Screen scroll={false}>
        {header}
        <View style={[styles.strollExperience, compactStroll && styles.strollExperienceCompact]}>
          {dailyGoal > 0 ? (
              <StrollGoalHeader
                goal={dailyGoal}
                streak={displayedStreak}
                strolled={dailyStrollCount}
              />
          ) : null}
          {strolledAllItems ? (
            <View style={styles.strollStateSlot}>
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
            </View>
          ) : strollProduct ? (
            <>
              <StrollCard
                compact={compactStroll}
                imageMaxHeight={strollImageMaxHeight}
                onPress={() => openProduct(strollProduct)}
                product={strollProduct}
              />
              <StrollScene
                bubbleText={speech.text}
                bubbleTone={speech.tone}
                celebrationKey={celebrationKey}
                mood={stoopyMood}
                reducedMotion={reducedMotion}
                resetKey={strollProduct.id}
                compact={compactStroll}
              />
              <StrollActionDock
                inOrder={isInOrder(strollProduct)}
                onAdd={() => {
                  if (handleStrollAdd(strollProduct)) {
                    handleStrollOn(strollProduct);
                  }
                }}
                onNext={() => handleStrollOn(strollProduct)}
                onOrderFullPress={handleOrderFullPress}
                orderFull={orderFull}
              />
            </>
          ) : (
            <View style={styles.strollStateSlot}>
              <NoResultsView />
            </View>
          )}
          {dailyDone && dailyGoal > 0 ? (
            <DailyCompleteOverlay
              goal={dailyGoal}
              onContinue={continueDailyStroll}
              reducedMotion={reducedMotion}
              streak={displayedStreak}
            />
          ) : null}
        </View>
        <OrderFullToast
          onViewOrder={openOrderTab}
          visible={orderFullToastVisible}
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
                onOrderFullPress={showOrderFullToast}
                onPress={openProduct}
                onSeeAll={() => openCollection(group.category)}
                orderFull={orderFull}
                products={group.products}
                title={group.category}
              />
            ))
          ) : (
            <NoResultsView />
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
        <OrderFullToast
          onViewOrder={openOrderTab}
          visible={orderFullToastVisible}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={gridProducts}
        keyExtractor={(item) => item.variantId}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <NoResultsView />
        }
        renderItem={({ item }) => (
          <ProductCard
            inOrder={isInOrder(item)}
            onAdd={() => addProduct(item)}
            onOrderFullPress={showOrderFullToast}
            onPress={() => openProduct(item)}
            orderFull={orderFull}
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
      <OrderFullToast
        onViewOrder={openOrderTab}
        visible={orderFullToastVisible}
      />
    </Screen>
  );
}

function CollectionShelf({
  inOrder,
  onAdd,
  onOrderFullPress,
  onPress,
  onSeeAll,
  orderFull,
  products,
  title
}: {
  inOrder: (product: Product) => boolean;
  onAdd: (product: Product) => void;
  onOrderFullPress: () => void;
  onPress: (product: Product) => void;
  onSeeAll: () => void;
  orderFull: boolean;
  products: Product[];
  title: string;
}) {
  const visibleProducts = products.slice(0, 4);
  const moreCount = Math.max(products.length - visibleProducts.length, 0);

  return (
    <View style={styles.shelf}>
      <View style={styles.shelfHeader}>
        <Text numberOfLines={1} style={styles.shelfTitle}>
          {title}
        </Text>
        <Text style={styles.shelfCount}>{products.length} finds</Text>
        <Pressable accessibilityRole="button" onPress={onSeeAll} style={styles.seeAll}>
          <Text style={styles.seeAllText}>See all ›</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.shelfTrackContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.shelfTrack}
      >
        {visibleProducts.map((product) => (
          <View key={product.variantId} style={styles.shelfCardSlot}>
            <ProductCard
              inOrder={inOrder(product)}
              onAdd={() => onAdd(product)}
              onOrderFullPress={onOrderFullPress}
              onPress={() => onPress(product)}
              orderFull={orderFull}
              product={product}
              variant="rail"
            />
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={onSeeAll} style={styles.endcap}>
          <View style={styles.endcapRing}>
            <Text style={styles.endcapPlus}>+</Text>
          </View>
          <Text style={styles.endcapText}>
            {moreCount > 0 ? `${moreCount}+ more` : "See all"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
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
  compact,
  imageMaxHeight,
  onPress,
  product
}: {
  compact: boolean;
  imageMaxHeight: number;
  onPress: () => void;
  product: Product;
}) {
  const image = product.images[0];
  const condition = product.condition || "Good used condition";
  const originLine = condition || `Rescued from ${product.category || "the curb"}`;

  return (
    <View style={[styles.strollCard, compact && styles.strollCardCompact]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${product.title}`}
        onPress={onPress}
        style={({ pressed }) => [styles.strollImageButton, pressed && styles.pressed]}
      >
        <View style={[styles.strollImageFrame, { height: imageMaxHeight, maxHeight: imageMaxHeight }]}>
          {image ? (
            <Image source={{ uri: image }} style={styles.strollImage} resizeMode="cover" />
          ) : (
            <View style={[styles.strollImage, styles.imageFallback]}>
              <Text style={typography.h2}>$0</Text>
            </View>
          )}
        </View>
      </Pressable>
      <View style={styles.strollBody}>
        <Pressable onPress={onPress}>
          <Text numberOfLines={2} style={[styles.strollTitle, compact && styles.strollTitleCompact]}>
            {product.title}
          </Text>
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
        <View style={styles.originRow}>
          <PinIcon />
          <Text numberOfLines={1} style={styles.originText}>
            {originLine}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PinIcon() {
  return (
    <Svg height={15} viewBox="0 0 24 24" width={15}>
      <Path
        d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"
        fill="none"
        stroke={colors.forest}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
      <Circle cx={12} cy={9} fill="none" r={2.2} stroke={colors.forest} strokeWidth={2.2} />
    </Svg>
  );
}

function StrollActionDock({
  inOrder,
  onAdd,
  onNext,
  onOrderFullPress,
  orderFull
}: {
  inOrder: boolean;
  onAdd: () => void;
  onNext: () => void;
  onOrderFullPress: () => void;
  orderFull: boolean;
}) {
  return (
    <View style={styles.strollActions}>
      <AppButton
        label="Stroll on"
        variant="secondary"
        onPress={onNext}
        style={styles.strollActionButton}
      />
      {orderFull && !inOrder ? (
        <OrderFullButton onPress={onOrderFullPress} style={styles.strollActionButton} />
      ) : (
        <AppButton
          disabled={inOrder}
          label={inOrder ? "In your order" : "Reserve"}
          onPress={onAdd}
          style={styles.strollActionButton}
          variant={inOrder ? "accent" : "primary"}
        />
      )}
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

function shuffle<T>(items: T[]) {
  const nextItems = [...items];
  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }
  return nextItems;
}

function pickRandom(items: string[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0] ?? "";
}

function getLocalDateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA");
}

function emptyStrollStreak(): StrollStreakState {
  return { streakCount: 0, lastCompletedDate: null };
}

function isStrollStreakState(value: unknown): value is StrollStreakState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StrollStreakState>;
  return (
    typeof candidate.streakCount === "number" &&
    Number.isFinite(candidate.streakCount) &&
    (candidate.lastCompletedDate === null ||
      typeof candidate.lastCompletedDate === "string")
  );
}

async function loadStrollStreak(): Promise<StrollStreakState> {
  try {
    const storedJson = await AsyncStorage.getItem(STROLL_STREAK_KEY);
    if (!storedJson) return emptyStrollStreak();
    const storedValue = JSON.parse(storedJson) as unknown;
    if (!isStrollStreakState(storedValue)) return emptyStrollStreak();
    return {
      streakCount: Math.max(0, Math.floor(storedValue.streakCount)),
      lastCompletedDate: storedValue.lastCompletedDate
    };
  } catch {
    return emptyStrollStreak();
  }
}

function getDisplayStreak(streakState: StrollStreakState) {
  if (!streakState.lastCompletedDate) return 0;
  const today = getLocalDateKey();
  const yesterday = getLocalDateKey(new Date(Date.now() - 864e5));
  if (
    streakState.lastCompletedDate !== today &&
    streakState.lastCompletedDate !== yesterday
  ) {
    return 0;
  }
  return streakState.streakCount;
}

const styles = StyleSheet.create({
  list: {
    padding: 18,
    paddingBottom: spacing.xxl
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  strollHeader: {
    gap: spacing.sm,
    marginBottom: spacing.sm
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
    borderRadius: radii.pill,
    flexDirection: "row",
    padding: spacing.xs
  },
  segmentOption: {
    alignItems: "center",
    borderRadius: radii.pill,
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
    borderRadius: radii.search,
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
  activeCategory: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  activeCategoryText: {
    color: colors.forest,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900"
  },
  activeCategoryClear: {
    paddingVertical: 2
  },
  activeCategoryClearText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  offlinePill: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderRadius: radii.pill,
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
    marginHorizontal: -18,
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
    gap: 14,
    marginBottom: spacing.lg
  },
  shelf: {
    gap: 0,
    marginBottom: spacing.xl
  },
  shelfHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: 11
  },
  shelfTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 16.5,
    fontWeight: "800",
    letterSpacing: 0
  },
  shelfCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  seeAll: {
    marginLeft: "auto",
    paddingVertical: 2
  },
  seeAllText: {
    color: colors.forest,
    fontSize: 12.5,
    fontWeight: "800"
  },
  shelfCardSlot: {
    minHeight: 184,
    width: 138
  },
  shelfTrack: {
    marginHorizontal: -18,
    minHeight: 190
  },
  shelfTrackContent: {
    alignItems: "flex-start",
    gap: 11,
    paddingBottom: 2,
    paddingHorizontal: 18
  },
  endcap: {
    alignItems: "center",
    flex: 0,
    gap: 7,
    justifyContent: "center",
    minHeight: 184,
    width: 96
  },
  endcapRing: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  endcapPlus: {
    color: colors.forest,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 28
  },
  endcapText: {
    color: colors.forest,
    fontSize: 11.5,
    fontWeight: "800",
    textAlign: "center"
  },
  loadMore: {
    marginTop: spacing.sm
  },
  pressed: {
    opacity: 0.8
  },
  strollExperience: {
    flex: 1,
    gap: spacing.sm,
    minHeight: 0,
    position: "relative"
  },
  strollExperienceCompact: {
    gap: spacing.xs
  },
  strollStateSlot: {
    flex: 1,
    minHeight: 0
  },
  strollCard: {
    alignItems: "stretch",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    gap: spacing.sm,
    minHeight: 0,
    overflow: "visible",
    padding: spacing.md,
    shadowColor: colors.ink,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14
  },
  strollCardCompact: {
    gap: spacing.xs,
    padding: spacing.sm
  },
  strollImageButton: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "center",
    minHeight: 0
  },
  strollImageFrame: {
    alignSelf: "stretch",
    aspectRatio: 1.25,
    backgroundColor: colors.paper2,
    borderRadius: radii.inner,
    flexShrink: 1,
    minHeight: 0,
    overflow: "hidden",
    width: "100%"
  },
  strollImage: {
    flexShrink: 1,
    height: "100%",
    maxHeight: "100%",
    minHeight: 0,
    width: "100%"
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center"
  },
  strollBody: {
    flexShrink: 0,
    minWidth: 0,
    gap: spacing.xs
  },
  strollTitle: {
    color: colors.ink,
    flexShrink: 0,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 27,
    minHeight: 54
  },
  strollTitleCompact: {
    fontSize: 19,
    lineHeight: 23,
    minHeight: 46
  },
  stoopyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  speechBubble: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.inner,
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
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    flexShrink: 0
  },
  pricePill: {
    backgroundColor: colors.forest,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  pricePillText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: "900"
  },
  categoryPill: {
    backgroundColor: colors.paper2,
    borderRadius: radii.pill,
    maxWidth: "48%",
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
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  stockPillText: {
    color: colors.limeInk,
    fontSize: 13,
    fontWeight: "900"
  },
  originRow: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.xs
  },
  originText: {
    color: colors.ink2,
    flex: 1,
    fontSize: 13,
    fontStyle: "italic",
    fontWeight: "700",
    lineHeight: 18
  },
  strollActions: {
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.sm,
    paddingTop: spacing.xs
  },
  strollActionButton: {
    flex: 1
  }
});
