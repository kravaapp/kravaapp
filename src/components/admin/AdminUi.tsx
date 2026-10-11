import { COLORS } from "@/components/ClientHeader";
import { PropsWithChildren, ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  DimensionValue,
  StyleProp,
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
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) => (
  <View style={[styles.card, style]}>{children}</View>
);
export const SectionTitle = ({ children }: PropsWithChildren) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);
export const AdminPageHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <View style={styles.pageHeader}>
    <Text style={styles.pageTitle}>{title}</Text>
    {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
  </View>
);
export const Pill = ({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "neutral" | "muted";
}) => {
  const colors: Record<string, [string, string]> = {
    primary: ["#FFF0E6", COLORS.mainOrange],
    success: [COLORS.successSurface, "#15803d"],
    warning: [COLORS.warningSurface, "#b45309"],
    danger: ["#fee2e2", COLORS.destructive],
    info: [COLORS.infoSurface, COLORS.info],
    neutral: ["#f3f4f6", COLORS.mutedForeground],
    muted: ["#f3f4f6", COLORS.mutedForeground],
  };
  const palette = colors[tone] ?? colors.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: palette[0] }]}>
      <Text style={[styles.pillText, { color: palette[1] }]}>{label}</Text>
    </View>
  );
};
export const ActionButton = ({
  label,
  onPress,
  outline = false,
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    activeOpacity={0.75}
    accessibilityRole="button"
    onPress={onPress}
    disabled={disabled}
    style={[styles.button, outline && styles.buttonOutline, disabled && styles.disabled]}
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
          width: `${Math.max(0, Math.min(value, 100))}%`,
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
  screen: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 110, gap: 20 },
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  pageHeader: { gap: 4, paddingBottom: 2 },
  pageTitle: { color: COLORS.foreground, fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
  pageSubtitle: { color: COLORS.mutedForeground, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: COLORS.foreground, fontSize: 19, fontWeight: "800", letterSpacing: -0.4 },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { fontSize: 11, fontWeight: "700" },
  button: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.mainOrange,
  },
  buttonOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#F1B68F",
  },
  buttonText: { color: COLORS.white, fontSize: 13, fontWeight: "700" },
  buttonOutlineText: { color: COLORS.mainOrange },
  disabled: { opacity: 0.5 },
  track: {
    height: 8,
    backgroundColor: "#E7E8EB",
    borderRadius: 99,
    overflow: "hidden",
    flex: 1,
  },
  fill: { height: "100%", borderRadius: 99 },
  skeleton: { backgroundColor: "#e2e8f0" },
});
