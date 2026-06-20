import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import {
  useCallback,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/theme";
import type { Product } from "../../../types/product";
import { StrollProductFace } from "./StrollProductFace";

export type StrollDirection = "left" | "right";
export type StrollDeckHandle = {
  fling: (direction: StrollDirection) => void;
};

type StrollDeckProps = {
  isInOrder: (product: Product) => boolean;
  onAttemptReserve: (product: Product) => boolean;
  onOpenProduct: (product: Product) => void;
  onResolved: (direction: StrollDirection, product: Product) => void;
  products: Product[];
};

const swipeThreshold = 96;

export const StrollDeck = forwardRef<StrollDeckHandle, StrollDeckProps>(
  function StrollDeck(
    { isInOrder, onAttemptReserve, onOpenProduct, onResolved, products },
    ref
  ) {
    const { height, width } = useWindowDimensions();
    const deckWidth = Math.min(430, width - spacing.lg * 2);
    const deckHeight = Math.max(260, Math.min(deckWidth * 1.18, height * 0.44));
    const position = useRef(new Animated.ValueXY()).current;
    const [exitingProduct, setExitingProduct] = useState<Product | null>(null);
    const [animating, setAnimating] = useState(false);
    const topProduct = exitingProduct ?? products[0] ?? null;
    const stackProducts = useMemo(() => {
      if (!exitingProduct) return products.slice(0, 3);

      return [
        exitingProduct,
        ...products.filter((product) => product.id !== exitingProduct.id).slice(0, 2)
      ];
    }, [exitingProduct, products]);

    useEffect(() => {
      position.setValue({ x: 0, y: 0 });
    }, [position, products[0]?.id]);

    const snapBack = useCallback(() => {
      Animated.spring(position, {
        friction: 6,
        tension: 90,
        toValue: { x: 0, y: 0 },
        useNativeDriver: false
      }).start();
    }, [position]);

    const attemptResolve = useCallback((direction: StrollDirection) => {
      if (!topProduct || animating) return;

      if (direction === "right" && !onAttemptReserve(topProduct)) {
        snapBack();
        return;
      }

      setAnimating(true);
      setExitingProduct(topProduct);
      Animated.timing(position, {
        duration: 250,
        toValue: {
          x: direction === "right" ? deckWidth * 1.35 : -deckWidth * 1.35,
          y: -34
        },
        useNativeDriver: false
      }).start(() => {
        position.setValue({ x: 0, y: 0 });
        setAnimating(false);
        setExitingProduct(null);
        onResolved(direction, topProduct);
      });
    }, [
      animating,
      deckWidth,
      onAttemptReserve,
      onResolved,
      position,
      snapBack,
      topProduct
    ]);

    useImperativeHandle(ref, () => ({
      fling: (direction: StrollDirection) => {
        attemptResolve(direction);
      }
    }), [attemptResolve]);

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponder: (_, gesture) =>
            Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
          onPanResponderMove: Animated.event(
            [null, { dx: position.x, dy: position.y }],
            { useNativeDriver: false }
          ),
          onPanResponderRelease: (_, gesture) => {
            if (Math.abs(gesture.dx) > swipeThreshold) {
              attemptResolve(gesture.dx > 0 ? "right" : "left");
              return;
            }

            snapBack();
          },
          onPanResponderTerminate: () => snapBack()
        }),
      [attemptResolve, position, snapBack]
    );

    const rotate = position.x.interpolate({
      inputRange: [-deckWidth, 0, deckWidth],
      outputRange: ["-16deg", "0deg", "16deg"]
    });
    const reserveOpacity = position.x.interpolate({
      inputRange: [0, swipeThreshold],
      outputRange: [0, 1],
      extrapolate: "clamp"
    });
    const strollOpacity = position.x.interpolate({
      inputRange: [-swipeThreshold, 0],
      outputRange: [1, 0],
      extrapolate: "clamp"
    });

    if (!topProduct) return null;

    return (
      <View style={[styles.deck, { height: deckHeight }]}>
        {stackProducts
          .map((product, index) => ({ index, product }))
          .reverse()
          .map(({ index, product }) => {
            const top = index === 0;
            const scale = top ? 1 : index === 1 ? 0.95 : 0.9;
            const translateY = top ? 0 : index === 1 ? 12 : 24;

            return (
              <Animated.View
                key={`${product.id}-${top ? "top" : index}`}
                {...(top ? panResponder.panHandlers : {})}
                style={[
                  styles.cardSlot,
                  {
                    transform: top
                      ? [
                          { translateX: position.x },
                          { translateY: position.y },
                          { rotate }
                        ]
                      : [{ scale }, { translateY }]
                  }
                ]}
              >
                <StrollProductFace
                  inOrder={isInOrder(product)}
                  onPress={() => onOpenProduct(product)}
                  product={product}
                />
                {top ? (
                  <>
                    <Stamp label="RESERVE" opacity={reserveOpacity} side="right" />
                    <Stamp label="STROLL" opacity={strollOpacity} side="left" />
                  </>
                ) : null}
              </Animated.View>
            );
          })}
      </View>
    );
  }
);

function Stamp({
  label,
  opacity,
  side
}: {
  label: string;
  opacity: Animated.AnimatedInterpolation<number>;
  side: "left" | "right";
}) {
  const reserve = side === "right";

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.stamp,
        reserve ? styles.reserveStamp : styles.strollStamp,
        {
          opacity,
          transform: [{ rotate: reserve ? "12deg" : "-12deg" }]
        }
      ]}
    >
      <Text style={[styles.stampText, reserve ? styles.reserveText : styles.strollText]}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardSlot: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  deck: {
    alignSelf: "center",
    marginTop: spacing.sm,
    position: "relative",
    width: "100%"
  },
  reserveStamp: {
    borderColor: colors.forest,
    right: spacing.lg
  },
  reserveText: {
    color: colors.forest
  },
  stamp: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 12,
    borderWidth: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    position: "absolute",
    top: spacing.lg,
    zIndex: 8
  },
  stampText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0
  },
  strollStamp: {
    borderColor: "#1CB0F6",
    left: spacing.lg
  },
  strollText: {
    color: "#1CB0F6"
  }
});
