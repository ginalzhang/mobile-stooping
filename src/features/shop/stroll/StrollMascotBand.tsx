import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { StoopyMascot } from "../../../components/StoopyMascot";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/theme";
import type { StrollMood, StrollSpeech } from "./useStrollDeck";

type StrollMascotBandProps = {
  goal: number;
  mood: StrollMood;
  seenCount: number;
  speech: StrollSpeech;
};

export function StrollMascotBand({
  goal,
  mood,
  seenCount,
  speech
}: StrollMascotBandProps) {
  const pop = useRef(new Animated.Value(1)).current;
  const mascot = useRef(new Animated.Value(0)).current;
  const street = useRef(new Animated.Value(0)).current;
  const progress = Math.min(1, seenCount / Math.max(goal, 1));

  useEffect(() => {
    pop.setValue(0.84);
    Animated.spring(pop, {
      friction: 5,
      tension: 120,
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [pop, speech.key]);

  useEffect(() => {
    mascot.setValue(0);
    Animated.sequence([
      Animated.timing(mascot, {
        duration: mood === "cheer" ? 220 : 160,
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.spring(mascot, {
        friction: 4,
        tension: 110,
        toValue: 0,
        useNativeDriver: true
      })
    ]).start();
  }, [mascot, mood]);

  useEffect(() => {
    const streetLoop = Animated.loop(
      Animated.timing(street, {
        duration: 1800,
        toValue: 1,
        useNativeDriver: true
      })
    );

    streetLoop.start();
    return () => streetLoop.stop();
  }, [street]);

  const mascotTranslateY = mascot.interpolate({
    inputRange: [0, 1],
    outputRange: [0, mood === "cheer" ? -18 : -7]
  });
  const mascotRotate = mascot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", mood === "wave" ? "-8deg" : "4deg"]
  });
  const streetTranslateX = street.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -72]
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.streakChip}>
          <Text style={styles.streakText}>{Math.min(seenCount, goal)}/{goal}</Text>
        </View>
      </View>
      <View style={styles.scene}>
        <View style={styles.streetStripe} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.streetMarks,
            { transform: [{ translateX: streetTranslateX }] }
          ]}
        >
          {Array.from({ length: 10 }, (_, index) => (
            <View key={index} style={styles.streetMark} />
          ))}
        </Animated.View>
        <Animated.View
          style={[
            styles.speechBubble,
            speech.tone === "skip" && styles.speechSkip,
            speech.tone === "cheer" && styles.speechCheer,
            { transform: [{ scale: pop }] }
          ]}
        >
          <Text style={styles.speechText}>{speech.text}</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.mascot,
            { transform: [{ translateY: mascotTranslateY }, { rotate: mascotRotate }] }
          ]}
        >
          <StoopyMascot caption="" size="small" />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mascot: {
    bottom: -10,
    left: spacing.md,
    position: "absolute",
    zIndex: 4
  },
  progressFill: {
    backgroundColor: colors.lime,
    borderRadius: 999,
    height: "100%"
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  progressTrack: {
    backgroundColor: colors.paper2,
    borderRadius: 999,
    flex: 1,
    height: 10,
    overflow: "hidden"
  },
  scene: {
    backgroundColor: "#DDF4FE",
    borderRadius: 8,
    height: 118,
    marginTop: spacing.sm,
    overflow: "hidden",
    position: "relative"
  },
  speechBubble: {
    backgroundColor: colors.card,
    borderColor: colors.forest,
    borderRadius: 14,
    borderWidth: 2,
    left: 86,
    maxWidth: 226,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
    top: spacing.sm,
    zIndex: 5
  },
  speechCheer: {
    backgroundColor: "#E8FBD4",
    borderColor: colors.lime
  },
  speechSkip: {
    backgroundColor: "#DDF4FE",
    borderColor: "#1CB0F6"
  },
  speechText: {
    color: colors.ink2,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19
  },
  streetStripe: {
    backgroundColor: "#C9BD9E",
    bottom: 0,
    height: 28,
    left: 0,
    position: "absolute",
    right: 0
  },
  streetMark: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 999,
    height: 4,
    marginRight: 42,
    width: 30
  },
  streetMarks: {
    alignItems: "center",
    bottom: 12,
    flexDirection: "row",
    left: 0,
    position: "absolute",
    width: 720,
    zIndex: 1
  },
  streakChip: {
    backgroundColor: "#FFF3CC",
    borderColor: "#FFC800",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  streakText: {
    color: "#8A6A12",
    fontSize: 12,
    fontWeight: "900"
  },
  wrap: {
    gap: spacing.xs
  }
});
