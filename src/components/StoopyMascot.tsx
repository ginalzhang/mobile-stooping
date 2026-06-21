import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle
} from "react-native";

import stoopyHappy from "../../assets/brand/stoopy-happy.png";
import stoopyHappyBody from "../../assets/brand/stoopy-happy-body.png";
import stoopyHalo from "../../assets/brand/stoopy-halo.png";
import stoopySad from "../../assets/brand/stoopy-sad.png";
import stoopySadBody from "../../assets/brand/stoopy-sad-body.png";
import stoopySadTearLeft from "../../assets/brand/stoopy-sad-tear-left.png";
import stoopySadTearRight from "../../assets/brand/stoopy-sad-tear-right.png";
import { colors } from "../theme/colors";
import { spacing } from "../theme/theme";

export type StoopyMood = "happy" | "sad";

type StoopyMascotProps = {
  size?: "tiny" | "small" | "medium" | "large";
  caption?: string;
  mood?: StoopyMood;
  containerStyle?: StyleProp<ViewStyle>;
};

const BODY_ASPECT = 771 / 720;
const HALO_ASPECT = 176 / 600;

const mascotWidths = {
  tiny: 48,
  small: 98,
  medium: 150,
  large: 200
};

const fullArt: Record<StoopyMood, ImageSourcePropType> = {
  happy: stoopyHappy,
  sad: stoopySad
};

export function StoopyMascot({
  size = "medium",
  caption = "Stoopy",
  mood = "happy",
  containerStyle
}: StoopyMascotProps) {
  const width = mascotWidths[size];
  const height = width * BODY_ASPECT;

  return (
    <View style={[styles.card, size === "small" && styles.smallCard, containerStyle]}>
      <StoopyLayers height={height} mood={mood} width={width} />
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

function StoopyLayers({
  height,
  mood,
  width
}: {
  height: number;
  mood: StoopyMood;
  width: number;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const haloSway = useRef(new Animated.Value(0)).current;
  const sadShake = useRef(new Animated.Value(0)).current;
  const tearLeft = useRef(new Animated.Value(0)).current;
  const tearRight = useRef(new Animated.Value(0)).current;
  const sad = mood === "sad";

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      haloSway.stopAnimation();
      haloSway.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(haloSway, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: false
        }),
        Animated.timing(haloSway, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: false
        })
      ])
    );
    loop.start();

    return () => {
      loop.stop();
      haloSway.setValue(0);
    };
  }, [haloSway, reduceMotion]);

  useEffect(() => {
    if (!sad || reduceMotion) {
      sadShake.stopAnimation();
      tearLeft.stopAnimation();
      tearRight.stopAnimation();
      sadShake.setValue(0);
      tearLeft.setValue(0);
      tearRight.setValue(0);
      return;
    }

    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(360),
        Animated.timing(sadShake, {
          duration: 70,
          easing: Easing.inOut(Easing.quad),
          toValue: -1,
          useNativeDriver: false
        }),
        Animated.timing(sadShake, {
          duration: 90,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: false
        }),
        Animated.timing(sadShake, {
          duration: 80,
          easing: Easing.inOut(Easing.quad),
          toValue: -0.45,
          useNativeDriver: false
        }),
        Animated.timing(sadShake, {
          duration: 120,
          easing: Easing.out(Easing.quad),
          toValue: 0,
          useNativeDriver: false
        }),
        Animated.delay(760)
      ])
    );
    const tearLeftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tearLeft, {
          duration: 1180,
          easing: Easing.in(Easing.quad),
          toValue: 1,
          useNativeDriver: false
        }),
        Animated.timing(tearLeft, {
          duration: 1,
          toValue: 0,
          useNativeDriver: false
        }),
        Animated.delay(1820)
      ])
    );
    const tearRightLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tearRight, {
          duration: 1180,
          easing: Easing.in(Easing.quad),
          toValue: 1,
          useNativeDriver: false
        }),
        Animated.timing(tearRight, {
          duration: 1,
          toValue: 0,
          useNativeDriver: false
        }),
        Animated.delay(1820)
      ])
    );
    shakeLoop.start();
    tearLeftLoop.start();
    const tearRightTimer = setTimeout(() => {
      tearRightLoop.start();
    }, 1500);

    return () => {
      shakeLoop.stop();
      tearLeftLoop.stop();
      tearRightLoop.stop();
      clearTimeout(tearRightTimer);
      sadShake.setValue(0);
      tearLeft.setValue(0);
      tearRight.setValue(0);
    };
  }, [reduceMotion, sad, sadShake, tearLeft, tearRight]);

  if (reduceMotion) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={getAccessibilityLabel(mood)}
        resizeMode="contain"
        source={fullArt[mood]}
        style={{ height, width }}
      />
    );
  }

  const haloWidth = width * (600 / 720);
  const haloHeight = haloWidth * HALO_ASPECT;
  const bodyTranslateX = sadShake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-width * 0.015, 0, width * 0.015]
  });
  const bodyRotate = sadShake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-1.4deg", "0deg", "1.4deg"]
  });
  const haloRotate = haloSway.interpolate({
    inputRange: [0, 1],
    outputRange: ["7deg", "13deg"]
  });
  const haloBob = haloSway.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.012]
  });
  const tearLeftTranslateY = tearLeft.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height * 0.16]
  });
  const tearLeftOpacity = tearLeft.interpolate({
    inputRange: [0, 0.18, 0.72, 1],
    outputRange: [1, 1, 0.65, 0]
  });
  const tearRightTranslateY = tearRight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height * 0.16]
  });
  const tearRightOpacity = tearRight.interpolate({
    inputRange: [0, 0.18, 0.72, 1],
    outputRange: [1, 1, 0.65, 0]
  });

  return (
    <View
      accessibilityLabel={getAccessibilityLabel(mood)}
      accessibilityRole="image"
      style={{ height, width }}
    >
      <Animated.Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={stoopyHalo}
        style={[
          styles.layer,
          {
            height: haloHeight,
            left: width * (60 / 720),
            top: height * (64 / 771),
            transform: [{ translateY: haloBob }, { rotate: haloRotate }],
            width: haloWidth
          }
        ]}
      />
      <Animated.View
        style={[
          styles.layer,
          {
            height,
            transform: [{ translateX: bodyTranslateX }, { rotate: bodyRotate }],
            width
          }
        ]}
      >
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={sad ? stoopySadBody : stoopyHappyBody}
          style={{ height, width }}
        />
        {sad ? (
          <>
            <Animated.Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={stoopySadTearLeft}
              style={[
                styles.layer,
                {
                  height,
                  opacity: tearLeftOpacity,
                  transform: [{ translateY: tearLeftTranslateY }],
                  width
                }
              ]}
            />
            <Animated.Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={stoopySadTearRight}
              style={[
                styles.layer,
                {
                  height,
                  opacity: tearRightOpacity,
                  transform: [{ translateY: tearRightTranslateY }],
                  width
                }
              ]}
            />
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

function getAccessibilityLabel(mood: StoopyMood) {
  return mood === "sad"
    ? "Stoopy looking sad"
    : "Stoopy, the Stooping Club mascot";
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 8,
    borderWidth: 0,
    gap: spacing.xs,
    padding: 0
  },
  layer: {
    position: "absolute"
  },
  smallCard: {
    padding: 0
  },
  caption: {
    color: colors.forest,
    fontSize: 13,
    fontWeight: "900"
  }
});
