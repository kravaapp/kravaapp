import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/components/ClientHeader";
import { Tabs } from "expo-router";
import {
  CalendarIcon,
  Clock,
  CreditCardIcon,
  HomeIcon,
} from "lucide-react-native";

const DEFAULT_ROUTE_ICONS: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  index: HomeIcon,
  schedule: CalendarIcon,
  paymentPlans: CreditCardIcon,
  history: Clock,
};

export type CurvedTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const TAB_BAR_HEIGHT = 64;
const BALL_SIZE = 54;
const NOTCH_WIDTH = 96;
const NOTCH_HEIGHT = 44;

// As 4 abas oficiais do menu do aluno
const VISIBLE_TAB_NAMES = ["index", "schedule", "paymentPlans", "history"];

// Mapeia rotas secundárias (sub-telas) para a aba correspondente na TabBar
const TAB_PARENT_MAP: Record<string, string> = {
  payment: "paymentPlans",
  pendingPayments: "paymentPlans",
};

/**
 * Recorte côncavo suave (notch invertido)
 */
function NotchSvg() {
  const w = NOTCH_WIDTH;
  const h = NOTCH_HEIGHT;
  const cx = w / 2;
  const depth = 28;

  const d = [
    `M 0 0`,
    `C ${cx * 0.45} 0, ${cx - 24} ${depth}, ${cx} ${depth}`,
    `C ${cx + 24} ${depth}, ${w - cx * 0.45} 0, ${w} 0`,
    `V ${h}`,
    `H 0`,
    `Z`,
  ].join(" ");

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path d={d} fill={COLORS.white} />
      <Path
        d={`M 0 0.5 C ${cx * 0.45} 0.5, ${cx - 24} ${depth + 0.5}, ${cx} ${depth + 0.5} C ${cx + 24} ${depth + 0.5}, ${w - cx * 0.45} 0.5, ${w} 0.5`}
        stroke="rgba(15, 23, 42, 0.08)"
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}

export function CurvedTabBar({ state, descriptors, navigation }: CurvedTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  // Filtra estritamente as 4 abas principais da navegação do aluno
  const visibleRoutes = useMemo(() => {
    return state.routes.filter((route) => VISIBLE_TAB_NAMES.includes(route.name));
  }, [state.routes]);

  const numTabs = visibleRoutes.length || 4;

  const currentRouteName = state.routes[state.index]?.name;
  const activeRouteName = (currentRouteName && TAB_PARENT_MAP[currentRouteName]) || currentRouteName;
  const activeVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((r) => r.name === activeRouteName)
  );

  // Valor animado horizontal (desliza de uma aba para a outra)
  const tabWidth = barWidth > 0 ? barWidth / numTabs : 0;
  const targetX = tabWidth > 0 ? activeVisibleIndex * tabWidth + tabWidth / 2 : 0;

  const animatedX = useSharedValue(0);
  const isInitialized = useSharedValue(false);

  // Física vertical do quique da bola esportiva
  const bounceY = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - barWidth) > 1) {
      setBarWidth(width);
    }
  };

  useEffect(() => {
    if (tabWidth <= 0) return;

    if (!isInitialized.value || animatedX.value === 0) {
      // Primeira inicialização: posiciona imediatamente no centro da aba ativa
      animatedX.value = targetX;
      isInitialized.value = true;
    } else {
      // Troca de aba: a bola DESLIZA de um lado para o outro com física fluida
      animatedX.value = withSpring(targetX, {
        damping: 15,
        stiffness: 120,
        mass: 0.75,
      });

      // E durante o trajeto ela QUICA pelo ar e aterrissa com elasticidade (bounce & squash)
      bounceY.value = withSequence(
        withTiming(-28, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 180, easing: Easing.bounce }),
        withTiming(-8, { duration: 100, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 110, easing: Easing.inOut(Easing.quad) })
      );

      scaleX.value = withSequence(
        withTiming(0.82, { duration: 160 }),
        withTiming(1.2, { duration: 180 }),
        withTiming(0.95, { duration: 100 }),
        withTiming(1.0, { duration: 110 })
      );

      scaleY.value = withSequence(
        withTiming(1.2, { duration: 160 }),
        withTiming(0.8, { duration: 180 }),
        withTiming(1.06, { duration: 100 }),
        withTiming(1.0, { duration: 110 })
      );
    }
  }, [activeVisibleIndex, tabWidth]);

  // Estilo do notch deslizante
  const notchStyle = useAnimatedStyle(() => {
    if (animatedX.value === 0) return { opacity: 0 };
    return {
      opacity: 1,
      transform: [
        { translateX: animatedX.value - NOTCH_WIDTH / 2 },
      ],
    };
  });

  // Estilo da bola deslizante e quicando
  const ballStyle = useAnimatedStyle(() => {
    if (animatedX.value === 0) return { opacity: 0 };
    return {
      opacity: 1,
      transform: [
        { translateX: animatedX.value - BALL_SIZE / 2 },
        { translateY: bounceY.value },
        { scaleX: scaleX.value },
        { scaleY: scaleY.value },
      ],
    };
  });

  // Ícone ativo dentro da bola
  const activeRoute = visibleRoutes[activeVisibleIndex];
  const activeDescriptor = activeRoute ? descriptors[activeRoute.key] : null;
  const renderActiveIcon = () => {
    if (!activeRoute) return null;
    const { options } = activeDescriptor || {};
    if (options?.tabBarIcon) {
      return options.tabBarIcon({
        focused: true,
        color: COLORS.white,
        size: 26,
      });
    }
    const FallbackIcon = DEFAULT_ROUTE_ICONS[activeRoute.name];
    if (FallbackIcon) {
      return <FallbackIcon color={COLORS.white} size={26} />;
    }
    return null;
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.wrapper,
        {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* 1. Base sólida com sombra e borda */}
      <View style={styles.solidBackground} pointerEvents="none" />
      <View style={styles.topBorderLine} pointerEvents="none" />

      {/* 2. Recorte côncavo que desliza suavemente até a aba selecionada */}
      <Animated.View
        style={[styles.notchContainer, notchStyle]}
        pointerEvents="none"
      >
        <NotchSvg />
      </Animated.View>

      {/* 3. A Bola Esportiva que desliza horizontalmente E quica pelo ar até o destino */}
      <Animated.View
        style={[
          styles.ballContainer,
          {
            top: -BALL_SIZE / 2.8,
          },
          ballStyle,
        ]}
        pointerEvents="none"
      >
        <View style={styles.ballInner}>
          {renderActiveIcon()}
        </View>
      </Animated.View>

      {/* 4. As 4 abas distribuídas perfeitamente ocupando 25% de largura cada */}
      <View style={styles.tabsRow} pointerEvents="box-none">
        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key] || {};
          const isFocused = activeVisibleIndex === index;
          const FallbackIcon = DEFAULT_ROUTE_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel}
              testID={(options as any)?.tabBarTestID || `tab-${route.name}`}
              style={styles.tabButton}
            >
              <View
                style={[
                  styles.iconSlot,
                  isFocused && styles.focusedIconHidden,
                ]}
              >
                {options?.tabBarIcon ? (
                  options.tabBarIcon({
                    focused: false,
                    color: COLORS.grayLabels,
                    size: 24,
                  })
                ) : FallbackIcon ? (
                  <FallbackIcon color={COLORS.grayLabels} size={24} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    width: "100%",
    backgroundColor: "transparent",
  },
  solidBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: COLORS.white,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  topBorderLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  notchContainer: {
    position: "absolute",
    top: -0.5,
    width: NOTCH_WIDTH,
    height: NOTCH_HEIGHT,
    zIndex: 4,
  },
  ballContainer: {
    position: "absolute",
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    zIndex: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ballInner: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: COLORS.mainOrange, // Laranja oficial Krava
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.mainOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 2.5,
    borderColor: COLORS.white,
  },
  tabsRow: {
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    alignItems: "center",
    zIndex: 10,
  },
  tabButton: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  focusedIconHidden: {
    opacity: 0,
  },
});
