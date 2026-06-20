import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect
} from "react-native-svg";

import { colors } from "../theme/colors";
import { spacing } from "../theme/theme";

export type StoopyMood = "happy" | "sad";

type StoopyMascotProps = {
  size?: "small" | "medium" | "large";
  caption?: string;
  mood?: StoopyMood;
  containerStyle?: StyleProp<ViewStyle>;
};

const mascotSizes = {
  small: { height: 86, width: 98 },
  medium: { height: 132, width: 150 },
  large: { height: 176, width: 200 }
};

export function StoopyMascot({
  size = "medium",
  caption = "Stoopy",
  mood = "happy",
  containerStyle
}: StoopyMascotProps) {
  return (
    <View style={[styles.card, size === "small" && styles.smallCard, containerStyle]}>
      <StoopyArt mood={mood} style={mascotSizes[size]} />
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

function StoopyArt({
  mood,
  style
}: {
  mood: StoopyMood;
  style: { height: number; width: number };
}) {
  const sad = mood === "sad";

  return (
    <Svg
      accessibilityLabel={`Stoopy mascot, ${mood}`}
      height={style.height}
      viewBox="0 0 100 88"
      width={style.width}
    >
      <Ellipse cx={50} cy={78} fill="#00000018" rx={30} ry={5} />
      <Path
        d="M31 19c3-8 12-12 20-8 7-5 17-2 20 7 9 0 16 8 14 17 7 5 8 15 2 22 2 10-6 19-16 18-5 8-16 10-23 4-8 5-18 2-22-6-10-1-16-11-12-20-6-7-3-18 5-22-1-8 5-14 12-12Z"
        fill="#6EA84F"
        stroke="#294238"
        strokeLinejoin="round"
        strokeWidth={3}
      />
      <Circle cx={36} cy={30} fill="#83C45E" r={18} />
      <Circle cx={61} cy={29} fill="#83C45E" r={18} />
      <Circle cx={50} cy={51} fill="#7CB95A" r={25} />
      <Path
        d="M42 75c-1 5-5 8-10 8M60 75c1 5 5 8 10 8"
        fill="none"
        stroke="#294238"
        strokeLinecap="round"
        strokeWidth={4}
      />
      <Path
        d="M28 16c9-9 28-13 44-3"
        fill="none"
        stroke="#F1C84B"
        strokeLinecap="round"
        strokeWidth={4}
      />
      <Path
        d="M26 45c5-12 17-20 31-19m0 0-5-4m5 4-4 6M73 54c-7 11-21 16-34 12m0 0 4 5m-4-5 6-3"
        fill="none"
        stroke="#EDE6D3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
      />
      <G>
        {sad ? (
          <>
            <Path
              d="M33 43l11 4M66 43l-11 4"
              fill="none"
              stroke="#294238"
              strokeLinecap="round"
              strokeWidth={3}
            />
            <Circle cx={39} cy={51} fill="#294238" r={3.5} />
            <Circle cx={61} cy={51} fill="#294238" r={3.5} />
            <Path
              d="M42 64c5-6 12-6 17 0"
              fill="none"
              stroke="#294238"
              strokeLinecap="round"
              strokeWidth={3}
            />
            <Path
              d="M31 54c-3 5-3 9 0 12 3-3 3-7 0-12Z"
              fill="#7BD8F1"
              stroke="#294238"
              strokeWidth={1.5}
            />
            <Path
              d="M69 54c-3 5-3 9 0 12 3-3 3-7 0-12Z"
              fill="#7BD8F1"
              stroke="#294238"
              strokeWidth={1.5}
            />
          </>
        ) : (
          <>
            <Circle cx={39} cy={49} fill="#294238" r={4} />
            <Circle cx={61} cy={49} fill="#294238" r={4} />
            <Path
              d="M40 61c5 6 15 6 20 0"
              fill="none"
              stroke="#294238"
              strokeLinecap="round"
              strokeWidth={3}
            />
          </>
        )}
      </G>
      <Rect
        fill="#F4F1E8"
        height={7}
        rx={3.5}
        stroke="#294238"
        strokeWidth={2}
        width={18}
        x={41}
        y={28}
      />
    </Svg>
  );
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
  smallCard: {
    padding: 0
  },
  caption: {
    color: colors.forest,
    fontSize: 13,
    fontWeight: "900"
  }
});
