import { COLORS } from "@/components/ClientHeader";
import { PropsWithChildren, ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  DimensionValue,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

export const AdminScreen = ({ children }: PropsWithChildren) => (
  <View style={styles.screen}>{children}</View>
);
export const AdminCard = ({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) => (
  <View style={[styles.card, style]}>{children}</View>
);
export const SectionTitle = ({ children }: PropsWithChildren) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);
export const Pill = ({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
}) => {
  const colors = {
    primary: [COLORS.subOrange, COLORS.mainOrange],
    success: [COLORS.successSurface, "#15803d"],
    warning: [COLORS.warningSurface, "#b45309"],
    danger: ["#fee2e2", COLORS.destructive],
    info: [COLORS.infoSurface, COLORS.info],
    neutral: ["#f3f4f6", COLORS.mutedForeground],
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: colors[0] }]}>
      <Text style={[styles.pillText, { color: colors[1] }]}>{label}</Text>
    </View>
  );
};
export const ActionButton = ({
  label,
  onPress,
  outline = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  icon?: ReactNode;
}) => (
  <TouchableOpacity
    activeOpacity={0.75}
    onPress={onPress}
    style={[styles.button, outline && styles.buttonOutline]}
  >
    {icon}
    <Text style={[styles.buttonText, outline && styles.buttonOutlineText]}>
      {label}
    </Text>
  </TouchableOpacity>
);
export const ProgressBar = ({ value }: { value: number }) => (
  <View style={styles.track}>
    <View
      style={[
        styles.fill,
        {
          width: `${Math.min(value, 100)}%`,
          backgroundColor:
            value >= 90
              ? COLORS.destructive
              : value >= 70
                ? COLORS.warning
                : COLORS.mainOrange,
        },
      ]}
    />
  </View>
);
export const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

export const AdminSkeleton = ({
  width = "100%",
  height = 14,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) => {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: { color: COLORS.foreground, fontSize: 16, fontWeight: "700" },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: "700" },
  button: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.mainOrange,
  },
  buttonOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonText: { color: COLORS.white, fontSize: 12, fontWeight: "700" },
  buttonOutlineText: { color: COLORS.foreground },
  track: {
    height: 7,
    backgroundColor: "#f3f4f6",
    borderRadius: 99,
    overflow: "hidden",
    flex: 1,
  },
  fill: { height: "100%", borderRadius: 99 },
  skeleton: { backgroundColor: "#e2e8f0" },
});
