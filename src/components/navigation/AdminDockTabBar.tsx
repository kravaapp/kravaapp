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

  // Animated values for Bouncing Ball
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

  // Animated values for Launcher '+' button rotation, panel & dock fade
  const plusRotation = useSharedValue(0);
  const launcherProgress = useSharedValue(0);

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
    plusRotation.value = withSpring(45, { damping: 14, stiffness: 180 });
    launcherProgress.value = withSpring(1, { damping: 16, stiffness: 170 });
  };

  const closeLauncher = () => {
    plusRotation.value = withTiming(0, { duration: 200 });
    launcherProgress.value = withTiming(0, { duration: 180 });
    setTimeout(() => {
      setIsLauncherOpen(false);
    }, 180);
  };

  const handleNavigate = (route: string) => {
    closeLauncher();
    setTimeout(() => {
      router.push(route as any);
    }, 150);
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

  const plusAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${plusRotation.value}deg` }],
    };
  });

  // Animação para sumir o menu default ao abrir o '+'
  const dockAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: 1 - launcherProgress.value,
      transform: [
        { scale: 1 - launcherProgress.value * 0.12 },
        { translateY: launcherProgress.value * 12 },
      ],
    };
  });

  const launcherPanelStyle = useAnimatedStyle(() => {
    return {
      opacity: launcherProgress.value,
      transform: [
        { scale: 0.88 + launcherProgress.value * 0.12 },
        { translateY: (1 - launcherProgress.value) * 24 },
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
            <Text style={styles.launcherTitle}>Gestão do CT</Text>
            <TouchableOpacity
              onPress={closeLauncher}
              style={styles.launcherCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <X size={18} color={COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Grid com paleta oficial limpa do Krava */}
          <View style={styles.launcherGrid}>
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleNavigate("/(admin)/financial")}
            >
              <View style={styles.gridIconWrap}>
                <Wallet size={24} color={COLORS.mainOrange} strokeWidth={2.2} />
              </View>
              <Text style={styles.gridLabel}>Financeiro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleNavigate("/(admin)/financial/plans")}
            >
              <View style={styles.gridIconWrap}>
                <CreditCard
                  size={24}
                  color={COLORS.mainOrange}
                  strokeWidth={2.2}
                />
              </View>
              <Text style={styles.gridLabel}>Planos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleNavigate("/(admin)/modalities")}
            >
              <View style={styles.gridIconWrap}>
                <Globe2 size={24} color={COLORS.mainOrange} strokeWidth={2.2} />
              </View>
              <Text style={styles.gridLabel}>Modalidades</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleNavigate("/(admin)/settings")}
            >
              <View style={styles.gridIconWrap}>
                <Clock size={24} color={COLORS.mainOrange} strokeWidth={2.2} />
              </View>
              <Text style={styles.gridLabel}>Políticas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => handleNavigate("/(admin)/profile")}
            >
              <View style={styles.gridIconWrap}>
                <Building2
                  size={24}
                  color={COLORS.mainOrange}
                  strokeWidth={2.2}
                />
              </View>
              <Text style={styles.gridLabel}>Perfil CT</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridItem} onPress={handleSignOut}>
              <View
                style={[
                  styles.gridIconWrap,
                  { backgroundColor: "#FFF1F2", borderColor: "#FFE4E6" },
                ]}
              >
                <LogOut size={24} color={COLORS.destructive} strokeWidth={2.2} />
              </View>
              <Text style={[styles.gridLabel, { color: COLORS.destructive }]}>
                Sair
              </Text>
            </TouchableOpacity>
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

        {/* Botão de Ação Circular Flutuante (+ / X) */}
        <TouchableOpacity
          testID="launcher-plus-btn"
          activeOpacity={0.85}
          onPress={toggleLauncher}
          style={[styles.plusButton, isLauncherOpen && styles.plusButtonActive]}
          accessibilityRole="button"
          accessibilityLabel={isLauncherOpen ? "Fechar menu" : "Mais ações"}
        >
          <Animated.View style={plusAnimatedStyle}>
            <Plus size={25} color={COLORS.white} strokeWidth={2.6} />
          </Animated.View>
        </TouchableOpacity>
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
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
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
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 8,
  },
  plusButtonActive: {
    backgroundColor: "#0F172A",
    shadowColor: "#0F172A",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    zIndex: 9990,
  },
  launcherPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 14,
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
  launcherCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
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
    gap: 8,
  },
  gridIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.foreground,
    textAlign: "center",
  },
});
