import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/constants/colors";
import type { RefreshableScrollViewProps } from "./RefreshableScrollView";

const PULL_THRESHOLD = 72;

/** RefreshControl do React Native Web não implementa o gesto de atualização. */
const RefreshableScrollView = forwardRef<ScrollView, RefreshableScrollViewProps>(function RefreshableScrollView({ refreshing, onRefresh, enabled = true, testID = "refreshable-scroll", style, children, ...props }, forwardedRef) {
  const scrollRef = useRef<ScrollView>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const setRef = useCallback((instance: ScrollView | null) => {
    scrollRef.current = instance;
    if (typeof forwardedRef === "function") forwardedRef(instance);
    else if (forwardedRef) forwardedRef.current = instance;
  }, [forwardedRef]);

  useEffect(() => {
    setPullDistance(0);
    const node = scrollRef.current?.getScrollableNode() as HTMLElement | undefined;
    if (!node || refreshing || !enabled) return;
    let start: { x: number; y: number } | null = null;
    let distance = 0;
    const reset = () => {
      start = null;
      distance = 0;
      setPullDistance(0);
    };
    const onStart = (event: TouchEvent) => {
      reset();
      if (node.scrollTop > 0 || event.touches.length !== 1) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select")) return;
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY };
    };
    const onMove = (event: TouchEvent) => {
      if (!start) return;
      if (node.scrollTop > 0 || event.touches.length !== 1) return reset();
      const touch = event.touches[0];
      const dy = touch.clientY - start.y;
      if (Math.abs(touch.clientX - start.x) > Math.abs(dy)) return reset();
      distance = Math.max(0, dy);
      if (distance > 0 && event.cancelable) event.preventDefault();
      setPullDistance(distance);
    };
    const onEnd = () => {
      const shouldRefresh = distance >= PULL_THRESHOLD;
      reset();
      if (shouldRefresh) onRefresh();
    };
    node.addEventListener("touchstart", onStart, { passive: true });
    node.addEventListener("touchmove", onMove, { passive: false });
    node.addEventListener("touchend", onEnd);
    node.addEventListener("touchcancel", reset);
    return () => {
      node.removeEventListener("touchstart", onStart);
      node.removeEventListener("touchmove", onMove);
      node.removeEventListener("touchend", onEnd);
      node.removeEventListener("touchcancel", reset);
    };
  }, [onRefresh, refreshing, enabled]);

  return (
    <View style={[styles.container, style]}>
      {(refreshing || pullDistance > 0) && (
        <View style={[styles.indicator, { height: refreshing ? 56 : Math.min(pullDistance / 2, 96) }]} accessibilityLiveRegion="polite">
          {refreshing && <ActivityIndicator color={COLORS.mainOrange} size="small" />}
          <Text style={styles.label}>
            {refreshing ? "Atualizando..." : pullDistance >= PULL_THRESHOLD ? "Solte para atualizar" : "Puxe para atualizar"}
          </Text>
        </View>
      )}
      <ScrollView ref={setRef} testID={testID} keyboardShouldPersistTaps="handled" {...props} style={[styles.container, style]}>
        {children}
      </ScrollView>
    </View>
  );
});

export default RefreshableScrollView;

const styles = StyleSheet.create({
  container: { flex: 1 },
  indicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden" },
  label: { fontSize: 13, color: COLORS.mutedForeground },
});
