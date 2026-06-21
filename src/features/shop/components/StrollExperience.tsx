import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type ViewStyle
} from "react-native";
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText
} from "react-native-svg";

import { colors } from "../../../theme/colors";
import { radii, spacing, typography } from "../../../theme/theme";

export type StrollMood = "walk" | "wave" | "cheer";
export type SpeechTone = "neutral" | "skip" | "cheer";

type StrollGoalHeaderProps = {
  strolled: number;
  goal: number;
  streak: number;
};

type StrollSceneProps = {
  bubbleText: string;
  bubbleTone: SpeechTone;
  celebrationKey: number;
  compact?: boolean;
  mood: StrollMood;
  reducedMotion: boolean;
  resetKey?: string;
};

type DailyCompleteOverlayProps = {
  goal: number;
  onContinue: () => void;
  reducedMotion: boolean;
  streak: number;
};

const accent = {
  grass: "#58CC02",
  grassBg: "#E8FBD4",
  grassDk: "#4AA802",
  sky: "#1CB0F6",
  skyBg: "#DDF4FE",
  skyDk: "#1690CC",
  gold: "#FFC800",
  goldBg: "#FFF3CC",
  goldDk: "#E5A100",
  coral: "#FF5A4D",
  mascot: "#7BC24E",
  mascotDk: "#4F9A3A",
  mascotHi: "#A6DA77",
  recycleDk: "#3E7A28",
  halo: "#4E8C36"
};

const confettiColors = [
  accent.grass,
  accent.sky,
  accent.gold,
  accent.coral,
  colors.lime,
  "#9B7BE0"
];

const AnimatedG = Animated.createAnimatedComponent(G);

export function StrollGoalHeader({ goal, streak, strolled }: StrollGoalHeaderProps) {
  const clampedGoal = Math.max(goal, 1);
  const shown = Math.min(strolled, clampedGoal);
  const percent = `${Math.min((shown / clampedGoal) * 100, 100)}%` as DimensionValue;

  return (
    <View style={styles.goalWrap}>
      <View style={styles.goalTopRow}>
        <View>
          <Text style={styles.goalEyebrow}>Daily stroll</Text>
          <Text style={styles.goalTitle}>Walk the block with Stoopy</Text>
        </View>
        <StreakChip count={streak} />
      </View>
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: percent }]} />
        </View>
        <Text style={styles.progressCount}>
          {shown}/{clampedGoal}
        </Text>
      </View>
    </View>
  );
}

export function StrollScene({
  bubbleText,
  bubbleTone,
  celebrationKey,
  compact = false,
  mood,
  reducedMotion,
  resetKey
}: StrollSceneProps) {
  return (
    <View style={[styles.scene, compact && styles.sceneCompact]}>
      <StreetScene reducedMotion={reducedMotion} />
      <ConfettiBurst
        fireKey={celebrationKey}
        reducedMotion={reducedMotion}
        resetKey={resetKey}
      />
      <View style={styles.bubblePosition}>
        <SpeechBubble tone={bubbleTone}>{bubbleText}</SpeechBubble>
      </View>
      <View style={styles.mascotPosition}>
        <StoopyWalk mood={mood} reducedMotion={reducedMotion} size={compact ? 88 : 100} />
      </View>
    </View>
  );
}

export function DailyCompleteOverlay({
  goal,
  onContinue,
  reducedMotion,
  streak
}: DailyCompleteOverlayProps) {
  return (
    <View style={styles.dailyOverlay}>
      <View style={styles.dailyCard}>
        <StoopyWalk mood="cheer" reducedMotion={reducedMotion} size={132} />
        <Text style={styles.dailyEyebrow}>Daily goal complete</Text>
        <Text style={styles.dailyTitle}>{goal} finds strolled</Text>
        <Text style={styles.dailyBody}>
          You walked the block with Stoopy today. Come back tomorrow to keep the
          streak alive.
        </Text>
        <View style={styles.dailyStreak}>
          <StreakIcon />
          <Text style={styles.dailyStreakText}>{streak} day streak</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          style={({ pressed }) => [styles.keepButton, pressed && styles.keepButtonPressed]}
        >
          <Text style={styles.keepButtonText}>Keep strolling</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StreakChip({ count }: { count: number }) {
  return (
    <View style={styles.streakChip}>
      <StreakIcon />
      <Text style={styles.streakCount}>{count}</Text>
    </View>
  );
}

function StreakIcon() {
  return (
    <Svg height={16} viewBox="0 0 24 24" width={16}>
      <Path
        d="M12 2c1 4 5 5 5 9a5 5 0 0 1-10 0c0-1 .5-2 1-2 0 2 1.5 2.5 2 1 .5-2-1-4 2-8z"
        fill={accent.gold}
        stroke={accent.goldDk}
        strokeWidth="1.4"
      />
    </Svg>
  );
}

function SpeechBubble({
  children,
  tone
}: {
  children: string;
  tone: SpeechTone;
}) {
  const toneStyle = tone === "cheer" ? styles.bubbleCheer : tone === "skip" ? styles.bubbleSkip : null;

  return (
    <View style={[styles.bubble, toneStyle]}>
      <Text style={styles.bubbleText}>{children}</Text>
      <View style={[styles.bubbleTail, toneStyle]} />
    </View>
  );
}

function StoopyWalk({
  mood,
  reducedMotion,
  size
}: {
  mood: StrollMood;
  reducedMotion: boolean;
  size: number;
}) {
  const stride = useRef(new Animated.Value(0)).current;
  const cheer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    stride.setValue(0);
    const loop = Animated.loop(
      Animated.timing(stride, {
        duration: 640,
        easing: Easing.inOut(Easing.quad),
        toValue: 1,
        useNativeDriver: false
      }),
      { resetBeforeIteration: true }
    );
    loop.start();
    return () => {
      loop.stop();
      stride.setValue(0);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || mood !== "cheer") {
      cheer.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.timing(cheer, {
        duration: 140,
        easing: Easing.out(Easing.quad),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.spring(cheer, {
        friction: 4,
        tension: 120,
        toValue: 0,
        useNativeDriver: true
      })
    ]).start();
  }, [cheer, mood, reducedMotion]);

  const frameTranslateY = reducedMotion
    ? 0
    : cheer.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const scale = reducedMotion
    ? 1
    : cheer.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const bodyTranslateY = reducedMotion
    ? 0
    : stride.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0, -6, 0, -6, 0]
      });
  const legARotation = reducedMotion
    ? 0
    : stride.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [22, -22, 22]
      });
  const legBRotation = reducedMotion
    ? 0
    : stride.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [-22, 22, -22]
      });
  const haloRotation = reducedMotion
    ? 0
    : stride.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [-5, 5, -5]
      });
  const height = size * (320 / 280);

  return (
    <Animated.View
      style={[
        styles.stoopyFrame,
        {
          height,
          transform: [{ translateY: frameTranslateY }, { scale }],
          width: size
        }
      ]}
    >
      <Svg
        height={height}
        preserveAspectRatio="xMidYMid meet"
        viewBox="-30 -16 280 320"
        width={size}
      >
        <Ellipse cx="112" cy="246" fill="rgba(40,50,20,0.16)" rx="66" ry="12" />
        <AnimatedG
          originX="92"
          originY="190"
          rotation={legARotation as never}
        >
          <Line
            stroke="#16140F"
            strokeLinecap="round"
            strokeWidth="8"
            x1="92"
            x2="84"
            y1="190"
            y2="232"
          />
          <Ellipse cx="80" cy="236" fill="#16140F" rx="21" ry="8" transform="rotate(-14, 80, 236)" />
        </AnimatedG>
        <AnimatedG
          originX="132"
          originY="190"
          rotation={legBRotation as never}
        >
          <Line
            stroke="#16140F"
            strokeLinecap="round"
            strokeWidth="8"
            x1="132"
            x2="140"
            y1="190"
            y2="232"
          />
          <Ellipse cx="144" cy="236" fill="#16140F" rx="21" ry="8" transform="rotate(14, 144, 236)" />
        </AnimatedG>
        <AnimatedG y={bodyTranslateY as never}>
          <AnimatedG
            originX="112"
            originY="96"
            rotation={haloRotation as never}
          >
            <Ellipse cx="112" cy="96" fill="none" rx="124" ry="30" stroke={accent.halo} strokeWidth="9" />
          </AnimatedG>
          <G fill={accent.mascotDk}>
            <Circle cx="112" cy="66" r="55" />
            <Circle cx="69" cy="141" r="55" />
            <Circle cx="155" cy="141" r="55" />
            <Circle cx="112" cy="114" r="54" />
          </G>
          <G fill={accent.mascot}>
            <Circle cx="112" cy="66" r="51" />
            <Circle cx="69" cy="141" r="51" />
            <Circle cx="155" cy="141" r="51" />
            <Circle cx="112" cy="114" r="50" />
          </G>
          <Circle cx="96" cy="52" fill={accent.mascotHi} opacity="0.5" r="22" />
          <RecycleArrows />
          <Ellipse cx="82" cy="116" fill="#201E1A" rx="9" ry="10.5" />
          <Circle cx="78.5" cy="112" fill="#fff" r="2.6" />
          <Ellipse cx="142" cy="116" fill="#201E1A" rx="9" ry="10.5" />
          <Circle cx="138.5" cy="112" fill="#fff" r="2.6" />
          {mood === "cheer" ? (
            <Path d="M 92 133 Q 112 151 132 133 Q 112 144 92 133 Z" fill="#101010" />
          ) : (
            <Path
              d="M 92 137 C 102 149 122 149 132 137"
              fill="none"
              stroke="#101010"
              strokeLinecap="round"
              strokeWidth="6"
            />
          )}
          {mood === "cheer" ? (
            <G>
              <Path d="M 40 60 l 4 12 12 4 -12 4 -4 12 -4 -12 -12 -4 12 -4 z" fill={accent.gold} />
              <Path d="M 188 44 l 3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3 z" fill={accent.grass} />
              <Path d="M 214 110 l 2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5 z" fill={accent.sky} />
            </G>
          ) : null}
          {mood === "wave" ? (
            <Circle cx="206" cy="138" fill={accent.mascot} r="13" stroke={accent.mascotDk} strokeWidth="4" />
          ) : null}
        </AnimatedG>
      </Svg>
    </Animated.View>
  );
}

function RecycleArrows() {
  const arrows = buildRecycleArrows();

  return (
    <G>
      {arrows.map((arrow) => (
        <G key={arrow.key}>
          <Path
            d={arrow.arc}
            fill="none"
            stroke={accent.recycleDk}
            strokeLinecap="round"
            strokeWidth="27"
          />
          <Path
            d={arrow.head}
            fill={accent.recycleDk}
            stroke={accent.recycleDk}
            strokeLinejoin="round"
            strokeWidth="8"
          />
          <Path
            d={arrow.arc}
            fill="none"
            stroke={accent.mascot}
            strokeLinecap="round"
            strokeWidth="18"
          />
          <Path d={arrow.head} fill={accent.mascot} />
        </G>
      ))}
    </G>
  );
}

function buildRecycleArrows() {
  const lobes = [
    { cx: 112, cy: 66, w: -90 },
    { cx: 69, cy: 141, w: 142.5 },
    { cx: 155, cy: 141, w: 37.5 }
  ];
  const radius = 38;
  const span = 116;
  const degrees = Math.PI / 180;
  const point = (cx: number, cy: number, angle: number) => [
    cx + radius * Math.cos(angle * degrees),
    cy + radius * Math.sin(angle * degrees)
  ];
  const formatPoint = (value: number) => value.toFixed(1);

  return lobes.map((lobe, index) => {
    const startAngle = lobe.w - span;
    const endAngle = lobe.w + span;
    const [x0, y0] = point(lobe.cx, lobe.cy, startAngle);
    const [x1, y1] = point(lobe.cx, lobe.cy, endAngle);
    const largeArc = 2 * span > 180 ? 1 : 0;
    const arc = `M ${formatPoint(x0)} ${formatPoint(y0)} A ${radius} ${radius} 0 ${largeArc} 1 ${formatPoint(x1)} ${formatPoint(y1)}`;
    const tx = -Math.sin(endAngle * degrees);
    const ty = Math.cos(endAngle * degrees);
    const px = -ty;
    const py = tx;
    const tip = [x1 + tx * 25, y1 + ty * 25];
    const b1 = [x1 + px * 22, y1 + py * 22];
    const b2 = [x1 - px * 22, y1 - py * 22];
    const head = `M ${formatPoint(b1[0])} ${formatPoint(b1[1])} L ${formatPoint(tip[0])} ${formatPoint(tip[1])} L ${formatPoint(b2[0])} ${formatPoint(b2[1])} Z`;

    return { arc, head, key: index };
  });
}

function StreetScene({ reducedMotion }: { reducedMotion: boolean }) {
  const slide = useRef(new Animated.Value(0)).current;
  const [sceneWidth, setSceneWidth] = useState(360);
  const tileCount = Math.max(2, Math.ceil(sceneWidth / 360) + 2);

  useEffect(() => {
    slide.setValue(0);
    const loop = Animated.loop(
      Animated.timing(slide, {
        duration: 10500,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: false
      }),
      { resetBeforeIteration: true }
    );
    loop.start();
    return () => {
      loop.stop();
      slide.setValue(0);
    };
  }, []);

  const translateX = reducedMotion
    ? 0
    : slide.interpolate({ inputRange: [0, 1], outputRange: [0, -360] });

  return (
    <View
      onLayout={(event) => setSceneWidth(event.nativeEvent.layout.width)}
      style={StyleSheet.absoluteFill}
    >
      <View style={styles.skyBand} />
      <View style={styles.sun} />
      <Animated.View style={[styles.streetStrip, { transform: [{ translateX }] }]}>
        {Array.from({ length: tileCount }, (_, index) => (
          <StreetTile key={index} />
        ))}
      </Animated.View>
    </View>
  );
}

function StreetTile() {
  return (
    <Svg height={118} viewBox="0 0 360 118" width={360}>
      <Line stroke="#6E7B57" strokeLinecap="round" strokeWidth="5" x1="40" x2="40" y1="22" y2="88" />
      <Path d="M40 22 q0 -9 13 -11" fill="none" stroke="#6E7B57" strokeLinecap="round" strokeWidth="5" />
      <Circle cx="56" cy="9" fill={accent.gold} r="7" stroke={accent.goldDk} strokeWidth="2.5" />
      <Rect fill="#9A6A3C" height="30" rx="3" width="9" x="122" y="58" />
      <Circle cx="126" cy="48" fill={accent.mascot} r="24" stroke={accent.mascotDk} strokeWidth="3" />
      <Circle cx="115" cy="55" fill="#8FCF5C" r="15" />
      <G transform="translate(214 50)">
        <Rect fill={accent.coral} height="9" rx="3" width="32" x="0" y="22" />
        <Rect fill="#FF7368" height="40" rx="3" width="9" x="0" y="0" />
        <Rect fill="#E5483C" height="18" rx="3" width="9" x="23" y="22" />
      </G>
      <G transform="translate(300 60)">
        <Rect fill="#D9B98C" height="28" rx="4" stroke="#B68F5E" strokeWidth="2.5" width="40" x="0" y="0" />
        <Path d="M0 8 H40" stroke="#B68F5E" strokeWidth="2" />
        <SvgText fill="#7A5A30" fontSize="10" fontWeight="800" textAnchor="middle" x="20" y="22">
          FREE
        </SvgText>
      </G>
      <Rect fill="#C9BD9E" height="30" width="360" x="0" y="88" />
      <Rect fill="#B3A782" height="3" width="360" x="0" y="88" />
      {[60, 120, 180, 240, 300].map((x) => (
        <Line
          key={x}
          stroke="rgba(120,110,80,0.32)"
          strokeDasharray="4 4"
          strokeWidth="2"
          x1={x}
          x2={x}
          y1="91"
          y2="118"
        />
      ))}
    </Svg>
  );
}

function ConfettiBurst({
  fireKey,
  reducedMotion,
  resetKey
}: {
  fireKey: number;
  reducedMotion: boolean;
  resetKey?: string;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        color: confettiColors[index % confettiColors.length],
        left: (index % 8) * 18 - 64,
        size: 5 + (index % 4),
        top: Math.floor(index / 8) * 10,
        travelX: ((index % 2 === 0 ? -1 : 1) * (45 + index * 3)) / 1.5,
        travelY: -44 - (index % 6) * 12
      })),
    []
  );
  const valuesRef = useRef(pieces.map(() => new Animated.Value(0)));
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!fireKey || reducedMotion) {
      valuesRef.current.forEach((value) => {
        value.stopAnimation();
        value.setValue(0);
      });
      setShowConfetti(false);
      return;
    }

    valuesRef.current.forEach((value) => {
      value.stopAnimation();
      value.setValue(0);
    });
    setShowConfetti(true);

    const burst = Animated.parallel(
      valuesRef.current.map((value, index) =>
        Animated.timing(value, {
          delay: index * 10,
          duration: 880,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        })
      )
    );
    burst.start(({ finished }) => {
      if (finished) {
        setShowConfetti(false);
        valuesRef.current.forEach((value) => value.setValue(0));
      }
    });

    return () => {
      burst.stop();
    };
  }, [fireKey, reducedMotion]);

  useEffect(() => {
    valuesRef.current.forEach((value) => {
      value.stopAnimation();
      value.setValue(0);
    });
    setShowConfetti(false);
  }, [resetKey]);

  useEffect(() => {
    return () => {
      valuesRef.current.forEach((value) => value.stopAnimation());
    };
  }, []);

  if (!showConfetti || reducedMotion) return null;

  return (
    <View pointerEvents="none" style={styles.confettiRoot}>
      {pieces.map((piece, index) => (
        <Animated.View
          key={`${fireKey}-${index}`}
          style={[
            styles.confettiPiece,
            {
              backgroundColor: piece.color,
              height: piece.size,
              left: piece.left,
              opacity: valuesRef.current[index].interpolate({
                inputRange: [0, 0.15, 0.72, 1],
                outputRange: [0, 1, 1, 0]
              }),
              top: piece.top,
              transform: [
                {
                  translateX: valuesRef.current[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, piece.travelX]
                  })
                },
                {
                  translateY: valuesRef.current[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, piece.travelY]
                  })
                },
                {
                  rotate: valuesRef.current[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", `${120 + index * 18}deg`]
                  })
                }
              ],
              width: piece.size * 1.45
            }
          ]}
        />
      ))}
    </View>
  );
}

const shadow: ViewStyle = {
  elevation: 2,
  shadowColor: colors.ink,
  shadowOffset: { height: 4, width: 0 },
  shadowOpacity: 0.08,
  shadowRadius: 12
};

const styles = StyleSheet.create({
  goalWrap: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flexShrink: 0,
    gap: spacing.sm,
    padding: spacing.sm,
    ...shadow
  },
  goalTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  goalEyebrow: {
    color: colors.forest,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  goalTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  progressTrack: {
    backgroundColor: colors.paper2,
    borderRadius: radii.pill,
    flex: 1,
    height: 12,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.lime,
    borderRadius: radii.pill,
    height: "100%"
  },
  progressCount: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900",
    minWidth: 42,
    textAlign: "right"
  },
  streakChip: {
    alignItems: "center",
    backgroundColor: accent.goldBg,
    borderColor: accent.gold,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  streakCount: {
    color: "#8A6A12",
    fontSize: 13,
    fontWeight: "900"
  },
  scene: {
    borderColor: colors.border,
    borderRadius: radii.inner,
    borderWidth: 1,
    flexShrink: 0,
    height: 112,
    overflow: "hidden",
    position: "relative"
  },
  sceneCompact: {
    height: 96
  },
  skyBand: {
    backgroundColor: "#DDF4FE",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  sun: {
    backgroundColor: "#FFD84D",
    borderRadius: radii.pill,
    height: 30,
    position: "absolute",
    right: spacing.lg,
    top: spacing.sm,
    width: 30
  },
  streetStrip: {
    bottom: 0,
    flexDirection: "row",
    left: 0,
    position: "absolute"
  },
  bubblePosition: {
    left: 122,
    position: "absolute",
    right: spacing.md,
    top: spacing.xs,
    zIndex: 4
  },
  bubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderColor: colors.forest,
    borderRadius: radii.inner,
    borderWidth: 2,
    maxWidth: 210,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...shadow
  },
  bubbleCheer: {
    backgroundColor: accent.grassBg,
    borderColor: accent.grass
  },
  bubbleSkip: {
    backgroundColor: accent.skyBg,
    borderColor: accent.sky
  },
  bubbleText: {
    color: colors.ink2,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16
  },
  bubbleTail: {
    backgroundColor: colors.card,
    borderBottomColor: colors.forest,
    borderBottomWidth: 2,
    borderRightColor: colors.forest,
    borderRightWidth: 2,
    bottom: -8,
    height: 14,
    left: spacing.md,
    position: "absolute",
    transform: [{ rotate: "45deg" }],
    width: 14
  },
  stoopyFrame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible"
  },
  mascotPosition: {
    bottom: -10,
    left: spacing.xs,
    position: "absolute",
    zIndex: 3
  },
  confettiRoot: {
    left: "50%",
    position: "absolute",
    top: "48%",
    zIndex: 10
  },
  confettiPiece: {
    borderRadius: 2,
    position: "absolute"
  },
  dailyOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(26,25,24,0.46)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    padding: spacing.lg,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20
  },
  dailyCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.card,
    gap: spacing.sm,
    maxWidth: 330,
    padding: spacing.xl,
    width: "100%",
    ...shadow
  },
  dailyEyebrow: {
    color: accent.grassDk,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  dailyTitle: {
    ...typography.h2,
    textAlign: "center"
  },
  dailyBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    textAlign: "center"
  },
  dailyStreak: {
    alignItems: "center",
    backgroundColor: accent.goldBg,
    borderColor: accent.gold,
    borderRadius: radii.pill,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  dailyStreakText: {
    color: "#8A6A12",
    fontSize: 16,
    fontWeight: "900"
  },
  keepButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.forest,
    borderRadius: radii.button,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  keepButtonPressed: {
    transform: [{ scale: 0.99 }]
  },
  keepButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: "900"
  }
});
