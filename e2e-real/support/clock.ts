import type { ClassSlot } from "./api";
import { CT_TIMEZONE } from "./env";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Agora no fuso do CT, em minutos desde a meia-noite, e o dia da semana. */
function ctNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CT_TIMEZONE, hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday };
}

/**
 * Aula de hoje começando daqui a `minutesAhead` (arredondado para cima em 5 min), com 1h de duração.
 * Devolve null perto da meia-noite, quando a aula não cabe mais no dia.
 */
export function classSlot(minutesAhead: number): ClassSlot | null {
  const { minutes, weekday } = ctNow();
  const start = Math.ceil((minutes + minutesAhead) / 5) * 5;
  const end = start + 60;
  if (end >= 24 * 60) return null;
  const hhmm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  return { start: hhmm(start), end: hhmm(end), dayOfWeek: weekday, dayLabel: DAY_LABELS[weekday] };
}
