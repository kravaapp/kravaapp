import { useEffect, useState } from "react";

/**
 * Tempo até a reserva abrir: "1d 2h10min", "2h10min", "35min"; com `withSeconds`, abaixo de 10 minutos
 * vira "4min 08s" (e "45s" no último minuto). Sem segundos, nunca mostra menos de "1min".
 */
export function formatWait(ms: number, withSeconds = false): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (withSeconds && totalSeconds < 600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return minutes > 0 ? `${minutes}min ${seconds}s` : `${totalSeconds}s`;
  }

  const totalMinutes = Math.max(1, Math.ceil(totalSeconds / 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 || minutes > 0 ? `${days}d ${hours}h${minutes}min` : `${days}d`;
  if (hours > 0) return `${hours}h${minutes}min`;
  return `${minutes}min`;
}

/** "11:00" no horário do aparelho. */
export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Relógio que atualiza a cada `intervalMs` enquanto `enabled`; `offsetMs` corrige o relógio do aparelho. */
export function useNow(intervalMs: number, enabled = true, offsetMs = 0) {
  const [now, setNow] = useState(() => Date.now() + offsetMs);

  useEffect(() => {
    setNow(Date.now() + offsetMs);
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now() + offsetMs), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled, offsetMs]);

  return now;
}
