import { useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../../components/AppButton";
import { StateView } from "../../../components/StateView";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/theme";
import type { CartItem } from "../../../types/order";
import type { Product } from "../../../types/product";
import { ConfettiBurst } from "./ConfettiBurst";
import {
  StrollDeck,
  type StrollDeckHandle,
  type StrollDirection
} from "./StrollDeck";
import { StrollMascotBand } from "./StrollMascotBand";
import { useStrollDeck } from "./useStrollDeck";

type StrollExperienceProps = {
  cartItems: CartItem[];
  hasNextPage?: boolean;
  onNeedMoreProducts?: () => void;
  onOpenProduct: (product: Product) => void;
  onReserveProduct: (product: Product) => boolean;
  products: Product[];
  resetKey: string;
};

export function StrollExperience({
  cartItems,
  hasNextPage,
  onNeedMoreProducts,
  onOpenProduct,
  onReserveProduct,
  products,
  resetKey
}: StrollExperienceProps) {
  const deckRef = useRef<StrollDeckHandle>(null);
  const {
    celebrationKey,
    goal,
    hasAvailableProducts,
    markReserved,
    markSkipped,
    mood,
    reset,
    seenCount,
    speech,
    visibleProducts
  } = useStrollDeck({
    cartItems,
    hasNextPage,
    onNeedMoreProducts,
    products,
    resetKey
  });
  const topProduct = visibleProducts[0];
  const cartVariantIds = useMemo(
    () => new Set(cartItems.map((item) => item.product.variantId)),
    [cartItems]
  );
  const isInOrder = (product: Product) => cartVariantIds.has(product.variantId);

  const handleResolved = (direction: StrollDirection, product: Product) => {
    if (direction === "left") {
      markSkipped(product);
      return;
    }

    markReserved(product);
  };

  if (!visibleProducts.length) {
    return (
      <View style={styles.emptyWrap}>
        <StateView
          actionLabel={hasAvailableProducts ? "Start over" : undefined}
          loading={Boolean(hasNextPage)}
          message={
            hasNextPage
              ? "Stoopy is checking the next curb for more free finds."
              : hasAvailableProducts
                ? "Stoopy showed every available find in Stroll. New drops land before Sunday pickup."
                : "Everything currently listed has been claimed. Check back before the next Sunday pickup drop."
          }
          onAction={hasAvailableProducts ? reset : undefined}
          showMascot
          title={hasNextPage ? "Finding more free finds" : "You strolled the whole block"}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ConfettiBurst fireKey={celebrationKey} />
      <StrollMascotBand
        goal={goal}
        mood={mood}
        seenCount={seenCount}
        speech={speech}
      />
      <Text style={styles.hint}>Swipe right to reserve. Swipe left to stroll on.</Text>
      <StrollDeck
        ref={deckRef}
        isInOrder={isInOrder}
        onAttemptReserve={onReserveProduct}
        onOpenProduct={onOpenProduct}
        onResolved={handleResolved}
        products={visibleProducts}
      />
      <View style={styles.actions}>
        <AppButton
          accessibilityLabel="Stroll on to the next find"
          label="Stroll on"
          onPress={() => deckRef.current?.fling("left")}
          style={styles.actionButton}
          variant="secondary"
        />
        <AppButton
          accessibilityLabel={
            topProduct && isInOrder(topProduct)
              ? "This find is already in your order"
              : "Reserve this find"
          }
          disabled={topProduct ? isInOrder(topProduct) : true}
          label={topProduct && isInOrder(topProduct) ? "In your order" : "Reserve"}
          onPress={() => deckRef.current?.fling("right")}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center"
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center"
  },
  wrap: {
    flex: 1,
    gap: spacing.md,
    minHeight: 0,
    position: "relative"
  }
});
