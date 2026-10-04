import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/components/ClientHeader";
import { router, Tabs } from "expo-router";
import {
  Building2,
  Clock,
  CreditCard,
  Dumbbell,
  Globe2,
  LayoutGrid,
  LogOut,
  Plus,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import { useAuth } from "@/hooks/auth.hooks";

export type AdminDockTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const PRIMARY_TABS = [
  { name: "index", label: "Painel", Icon: LayoutGrid },
  { name: "students", label: "Membros", Icon: Users },
  { name: "classes", label: "Aulas", Icon: Dumbbell },
];

const BALL_SIZE = 46;
const DOCK_HEIGHT = 58;

// Timing & Easing adhering to Krava physics specifications:
// cubic-bezier(0.22, 1, 0.36, 1) provides a natural, snappy decelerating ease
const CUBIC_BEZIER = Easing.bezier(0.22, 1, 0.36, 1);
const OPEN_DURATION = 320;
const CLOSE_DURATION = 260;

const LAUNCHER_ITEMS = [
  {
    id: "financial",
    label: "Financeiro",
    route: "/(admin)/financial",
    Icon: Wallet,
  },
  {
    id: "plans",
    label: "Planos",
    route: "/(admin)/financial/plans",
    Icon: CreditCard,
  },
  {
    id: "modalities",
    label: "Modalidades",
    route: "/(admin)/modalities",
    Icon: Globe2,
  },
  {
    id: "settings",
    label: "Políticas",
    route: "/(admin)/settings",
    Icon: Clock,
  },
  {
    id: "profile",
    label: "Perfil CT",
    route: "/(admin)/profile",
    Icon: Building2,
  },
  {
    id: "logout",
    label: "Sair",
    route: null,
    Icon: LogOut,
    isDestructive: true,
  },
];

interface LauncherGridItemProps {
  item: (typeof LAUNCHER_ITEMS)[number];
  index: number;
  progress: SharedValue<number>;
  onPress: () => void;
}

function LauncherGridItem({
  item,
  index,
  progress,
  onPress,
}: LauncherGridItemProps) {
  const pressScale = useSharedValue(1);
  const [isPressed, setIsPressed] = useState(false);

  // Coordinated staggered entrance for each item based on its index
  const itemAnimatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const start = index * 0.05;
    const localProgress = Math.max(0, Math.min(1, (p - start) / 0.7));

    return {
      opacity: localProgress,
      transform: [
        { translateY: (1 - localProgress) * 12 },
        { scale: pressScale.value },
      ],
    };
  });

  const Icon = item.Icon;
  const isDestructive = item.isDestructive;

  return (
    <Animated.View style={[styles.gridItem, itemAnimatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          setIsPressed(true);
          pressScale.value = withTiming(0.95, { duration: 100 });
        }}
        onPressOut={() => {
          setIsPressed(false);
          pressScale.value = withTiming(1, { duration: 140 });
        }}
        style={styles.gridItemPressable}
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        <View
          style={[
            styles.gridIconWrap,
            isDestructive && styles.destructiveIconWrap,
            isPressed &&
              (isDestructive
                ? styles.destructiveIconPressed
                : styles.gridIconPressed),
          ]}
        >
          <Icon
            size={24}
            color={isDestructive ? COLORS.destructive : COLORS.mainOrange}
            strokeWidth={2.2}
          />
        </View>
        <Text
          style={[
            styles.gridLabel,
            isDestructive && { color: COLORS.destructive },
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function AdminDockTabBar({
  state,
  navigation,
}: AdminDockTabBarProps) {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [dockWidth, setDockWidth] = useState(0);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const activeRouteName = state.routes[state.index]?.name;
  const activePrimaryIndex = PRIMARY_TABS.findIndex(
    (t) => t.name === activeRouteName,
  );

  // Animated values for Bouncing Ball in Dock
  const numTabs = PRIMARY_TABS.length;
  const tabWidth = dockWidth > 0 ? dockWidth / numTabs : 0;
  const targetX =
    activePrimaryIndex >= 0 && tabWidth > 0
      ? activePrimaryIndex * tabWidth + tabWidth / 2
      : -100;

  const animatedX = useSharedValue(0);
  const isInitialized = useSharedValue(false);
  const bounceY = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);

  // Animated values for Launcher '+' button and panel
  const launcherProgress = useSharedValue(0);
  const btnPressScale = useSharedValue(1);

  const handleDockLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - dockWidth) > 1) {
      setDockWidth(width);
    }
  };

  useEffect(() => {
    if (tabWidth <= 0 || activePrimaryIndex < 0) return;

    if (!isInitialized.value || animatedX.value <= 0) {
      animatedX.value = targetX;
      isInitialized.value = true;
    } else {
      animatedX.value = withSpring(targetX, {
        damping: 16,
        stiffness: 140,
        mass: 0.7,
      });

      // Bouncing ball physics: elastic jump and squash upon landing
      bounceY.value = withSequence(
        withTiming(-16, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 170, easing: Easing.bounce }),
        withTiming(-3, { duration: 80, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 90, easing: Easing.inOut(Easing.quad) }),
      );

      scaleX.value = withSequence(
        withTiming(0.86, { duration: 150 }),
        withTiming(1.14, { duration: 170 }),
        withTiming(0.98, { duration: 80 }),
        withTiming(1.0, { duration: 90 }),
      );

      scaleY.value = withSequence(
        withTiming(1.16, { duration: 150 }),
        withTiming(0.88, { duration: 170 }),
        withTiming(1.03, { duration: 80 }),
        withTiming(1.0, { duration: 90 }),
      );
    }
  }, [activePrimaryIndex, tabWidth]);

  const toggleLauncher = () => {
    if (isLauncherOpen) {
      closeLauncher();
    } else {
      openLauncher();
    }
  };

  const openLauncher = () => {
    setIsLauncherOpen(true);
    launcherProgress.value = withTiming(1, {
      duration: OPEN_DURATION,
      easing: CUBIC_BEZIER,
    });
  };

  const closeLauncher = () => {
    launcherProgress.value = withTiming(0, {
      duration: CLOSE_DURATION,
      easing: CUBIC_BEZIER,
    });
    setTimeout(() => {
      setIsLauncherOpen(false);
    }, CLOSE_DURATION);
  };

  const handleNavigate = (route: string) => {
    closeLauncher();
    setTimeout(() => {
      router.push(route as any);
    }, 120);
  };

  const handleSignOut = () => {
    closeLauncher();
    Alert.alert("Sair do Krava", "Deseja realmente sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: () => {
          signOut();
          router.replace("/signIn");
        },
      },
    ]);
  };

  const ballStyle = useAnimatedStyle(() => {
    if (activePrimaryIndex < 0 || animatedX.value <= 0) {
      return { opacity: 0 };
    }
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

  // Action button micro-press feedback
  const btnAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: btnPressScale.value }],
    };
  });

  // Action button icon (+ -> X): smooth 45° rotation with a subtle scale dip
  const plusIconAnimatedStyle = useAnimatedStyle(() => {
    const p = launcherProgress.value;
    const rotateDeg = p * 45;
    const dip = 1 - 0.12 * Math.sin(p * Math.PI);
    return {
      transform: [{ rotate: `${rotateDeg}deg` }, { scale: dip }],
    };
  });

  // Primary dock smoothly fades and slightly scales down when the launcher opens
  const dockAnimatedStyle = useAnimatedStyle(() => {
    const p = launcherProgress.value;
    return {
      opacity: 1 - p,
      transform: [
        { scale: 1 - p * 0.08 },
        { translateY: p * 8 },
      ],
    };
  });

  // Launcher Panel expands outward from the '+' button (bottom-right origin)
  // Reverses back toward the button on close
  const launcherPanelStyle = useAnimatedStyle(() => {
    const p = launcherProgress.value;
    return {
      opacity: p,
      transform: [
        { translateX: (1 - p) * 50 },
        { translateY: (1 - p) * 40 },
        { scale: 0.22 + p * 0.78 },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: launcherProgress.value,
    };
  });

  const renderActiveIcon = () => {
    if (activePrimaryIndex < 0) return null;
    const ActiveIcon = PRIMARY_TABS[activePrimaryIndex]?.Icon;
    if (!ActiveIcon) return null;
    return <ActiveIcon size={23} color={COLORS.white} strokeWidth={2.6} />;
  };

  if (keyboardVisible) return null;

  return (
    <>
      {/* Backdrop semi-transparente para fechar ao tocar fora */}
      {isLauncherOpen && (
        <TouchableWithoutFeedback onPress={closeLauncher}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>
      )}

      {/* Painel Expansível da Grade (Launcher) */}
      {isLauncherOpen && (
        <Animated.View
          style={[
            styles.launcherPanel,
            {
              bottom:
                (insets.bottom > 0 ? insets.bottom + 8 : 16) + DOCK_HEIGHT + 14,
            },
            launcherPanelStyle,
          ]}
        >
          <View style={styles.launcherHeader}>
            <View>
              <Text style={styles.launcherTitle}>Gestão do CT</Text>
              <Text style={styles.launcherSubtitle}>
                Atalhos rápidos e configurações
              </Text>
            </View>
            <TouchableOpacity
              onPress={closeLauncher}
              style={styles.launcherCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar menu"
            >
              <X size={18} color={COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Grid com microinterações e paleta oficial limpa do Krava */}
          <View style={styles.launcherGrid}>
            {LAUNCHER_ITEMS.map((item, index) => (
              <LauncherGridItem
                key={item.id}
                item={item}
                index={index}
                progress={launcherProgress}
                onPress={() => {
                  if (item.isDestructive) {
                    handleSignOut();
                  } else if (item.route) {
                    handleNavigate(item.route);
                  }
                }}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Barra Inferior (Dock Flutuante + Botão '+') */}
      <View
        style={[
          styles.container,
          {
            bottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Dock Pill (some suavemente quando o '+' abre) */}
        <Animated.View
          style={[styles.dock, dockAnimatedStyle]}
          onLayout={handleDockLayout}
          pointerEvents={isLauncherOpen ? "none" : "auto"}
        >
          {/* Bolinha Laranja com o Ícone Ativo EMBUTIDO DENTRO DELA */}
          <Animated.View
            style={[styles.ballContainer, ballStyle]}
            pointerEvents="none"
          >
            <View style={styles.ballInner}>
              {renderActiveIcon()}
            </View>
          </Animated.View>

          {/* 3 Colunas dos Botões (renderiza apenas ícone inativo quando não focada) */}
          {PRIMARY_TABS.map((tab, index) => {
            const isFocused = activePrimaryIndex === index;
            const Icon = tab.Icon;

            const onPress = () => {
              if (isLauncherOpen) closeLauncher();

              const route = state.routes.find((r) => r.name === tab.name);
              if (!route) return;

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
                key={tab.name}
                testID={`tab-${tab.name}`}
                onPress={onPress}
                style={styles.tabButton}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={tab.label}
              >
                {!isFocused && (
                  <Icon
                    size={23}
                    color={COLORS.grayLabels}
                    strokeWidth={2}
                  />
                )}
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Botão de Ação Circular Flutuante (+ / X) em Laranja Krava permanente */}
        <Pressable
          testID="launcher-plus-btn"
          onPress={toggleLauncher}
          onPressIn={() => {
            btnPressScale.value = withTiming(0.94, {
              duration: 110,
              easing: CUBIC_BEZIER,
            });
          }}
          onPressOut={() => {
            btnPressScale.value = withTiming(1, {
              duration: 140,
              easing: CUBIC_BEZIER,
            });
          }}
          style={styles.plusButton}
          accessibilityRole="button"
          accessibilityLabel={isLauncherOpen ? "Fechar menu" : "Mais ações"}
        >
          <Animated.View style={btnAnimatedStyle}>
            <Animated.View style={plusIconAnimatedStyle}>
              <Plus size={26} color={COLORS.white} strokeWidth={2.6} />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 9999,
  },
  dock: {
    flex: 1,
    height: DOCK_HEIGHT,
    backgroundColor: COLORS.white,
    borderRadius: DOCK_HEIGHT / 2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  tabButton: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  ballContainer: {
    position: "absolute",
    width: BALL_SIZE,
    height: BALL_SIZE,
    left: 0,
    top: (DOCK_HEIGHT - BALL_SIZE) / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  ballInner: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: COLORS.mainOrange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.mainOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  plusButton: {
    width: DOCK_HEIGHT,
    height: DOCK_HEIGHT,
    borderRadius: DOCK_HEIGHT / 2,
    backgroundColor: COLORS.mainOrange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.mainOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 6,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    zIndex: 9990,
  },
  launcherPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
    zIndex: 9995,
  },
  launcherHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  launcherTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.foreground,
    letterSpacing: -0.3,
  },
  launcherSubtitle: {
    fontSize: 12,
    color: COLORS.grayLabels,
    marginTop: 2,
    fontWeight: "500",
  },
  launcherCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  launcherGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  gridItem: {
    width: "31%",
    alignItems: "center",
  },
  gridItemPressable: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  gridIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  gridIconPressed: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
  },
  destructiveIconWrap: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FFE4E6",
  },
  destructiveIconPressed: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.foreground,
    textAlign: "center",
  },
});
