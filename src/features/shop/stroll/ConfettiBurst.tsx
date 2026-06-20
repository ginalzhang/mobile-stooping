import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { colors } from "../../../theme/colors";

type ConfettiBurstProps = {
  fireKey: number;
};

const confettiColors = [
  colors.forest,
  colors.lime,
  "#1CB0F6",
  "#FFC800",
  colors.rust,
  "#9B7BE0"
];

export function ConfettiBurst({ fireKey }: ConfettiBurstProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(() => {
    if (!fireKey) return [];

    return Array.from({ length: 24 }, (_, index) => ({
      color: confettiColors[index % confettiColors.length],
      delay: (index % 6) * 18,
      size: 5 + (index % 4),
      tx: ((index % 8) - 3.5) * 28,
      ty: -90 - (index % 5) * 18
    }));
  }, [fireKey]);

  useEffect(() => {
    if (!fireKey) return;

    progress.setValue(0);
    Animated.timing(progress, {
      duration: 820,
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [fireKey, progress]);

  if (!fireKey) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {pieces.map((piece, index) => {
        const opacity = progress.interpolate({
          inputRange: [0, 0.18, 0.78, 1],
          outputRange: [0, 1, 1, 0]
        });
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.tx]
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.ty]
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${index % 2 === 0 ? 240 : -240}deg`]
        });

        return (
          <Animated.View
            key={`${fireKey}-${index}`}
            style={[
              styles.piece,
              {
                backgroundColor: piece.color,
                height: piece.size,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }],
                width: piece.size + 2
              }
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    borderRadius: 2,
    position: "absolute"
  },
  wrap: {
    alignItems: "center",
    bottom: 130,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 20
  }
});
