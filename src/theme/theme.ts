import { StyleSheet } from "react-native";

import { colors } from "./colors";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
};

export const radii = {
  card: 20,
  inner: 12,
  button: 14,
  pill: 999
};

export const typography = StyleSheet.create({
  h1: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 31
  },
  h2: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28
  },
  h3: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24
  },
  body: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22
  },
  caption: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  }
});
