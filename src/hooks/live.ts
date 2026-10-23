import { focusManager } from "@tanstack/react-query";
import { AppState, AppStateStatus, Platform } from "react-native";

/**
 * Telas do professor e do painel que precisam acompanhar as aulas sem recarregar (confirmações, chamada, fila):
 * atualiza a cada 10s enquanto a tela está em primeiro plano e na hora em que o app volta para a frente.
 */
export const LIVE_QUERY = {
  refetchInterval: 10_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
} as const;

/** No celular, o "foco" das queries segue o app em primeiro plano (na web o React Query já usa a aba). */
export function syncQueryFocusWithAppState() {
  if (Platform.OS === "web") return () => {};
  const subscription = AppState.addEventListener("change", (status: AppStateStatus) =>
    focusManager.setFocused(status === "active"),
  );
  return () => subscription.remove();
}
