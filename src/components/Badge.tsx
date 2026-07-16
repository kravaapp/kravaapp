import { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS } from './ClientHeader';

export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'manager'
  | 'info'
  | 'muted';

const VARIANTS: Record<BadgeVariant, { background: string; foreground: string }> = {
  primary: { background: 'rgba(233,90,7,0.1)', foreground: COLORS.mainOrange },
  success: { background: COLORS.successSurface, foreground: COLORS.success },
  warning: { background: '#fef3c7', foreground: COLORS.warning },
  destructive: { background: '#fee2e2', foreground: COLORS.destructive },
  manager: { background: '#ede9fe', foreground: '#7c3aed' },
  info: { background: COLORS.infoSurface, foreground: COLORS.info },
  muted: { background: '#f3f4f6', foreground: COLORS.mutedForeground },
};

export const PulseDot = ({ color }: { color: string }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulseDot, { backgroundColor: color, opacity }]} />;
};

type BadgeProps = PropsWithChildren<{
  variant?: BadgeVariant;
  pulse?: boolean;
  compact?: boolean;
}>;

export const Badge = ({ variant = 'muted', pulse, compact, children }: BadgeProps) => {
  const { background, foreground } = VARIANTS[variant];

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        { backgroundColor: background },
      ]}
    >
      {pulse && <PulseDot color={foreground} />}
      <Text
        style={[styles.badgeText, compact && styles.badgeTextCompact, { color: foreground }]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextCompact: {
    fontSize: 10,
    fontWeight: '500',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
