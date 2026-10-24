import type { Token } from "../../src/types/auth.types";
import { API_URL } from "./env";
import { PASSWORD, type SeededCt, type SeededUser } from "./seed";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Login real na API local. O /auth/login aceita 10 chamadas por minuto por IP: num 429, espera a janela virar.
 * Usuário com um só CT recebe o token direto, no mesmo formato que o app guarda.
 */
export async function login(user: SeededUser): Promise<Token> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: PASSWORD }),
    });
    if (response.status === 429) {
      await sleep(10_000);
      continue;
    }
    const body = await response.json();
    if (!response.ok || !body?.token?.accessToken) {
      throw new Error(`Login de ${user.email} falhou: ${response.status} ${JSON.stringify(body)}`);
    }
    return body.token as Token;
  }
  throw new Error(`Login de ${user.email} seguiu limitado (429) por mais de um minuto.`);
}

/** Chamada autenticada como o usuário do token, no CT dele (mesmos cabeçalhos do app). */
export async function api<T = unknown>(token: Token, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Tenant-Id": token.tenantId,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status}: ${text}`);
  return (text ? JSON.parse(text) : undefined) as T;
}

export type ClassSlot = { start: string; end: string; dayOfWeek: number; dayLabel: string };

type TodayOccurrence = { id: string; aulaName: string | null; status: string };

/** Preparação dos cenários que não testam a criação: a aula de hoje criada pela API, como o dono faria. */
export async function createClassViaApi(
  owner: Token, ct: SeededCt, slot: ClassSlot, name: string, maxCapacity: number,
): Promise<string> {
  await api(owner, "POST", "/scheduling/aulas", {
    modalidadeId: ct.modalidade.id,
    professorId: ct.professor.id,
    name,
    daysOfWeek: [slot.dayOfWeek],
    startTime: slot.start,
    endTime: slot.end,
    maxCapacity,
    allowTrial: false,
    minLevel: null,
    publicGender: "Mixed",
    waitlistTimeoutMinutes: null,
    notifyStudents: false,
  });
  return findTodayOccurrence(owner, name);
}

/** Lista de hoje da equipe do CT (dono ou professor); aluno recebe 403. */
export async function findTodayOccurrence(token: Token, aulaName: string): Promise<string> {
  const today = await api<TodayOccurrence[]>(token, "GET", "/scheduling/ocorrencias/today");
  const occurrence = today.find((o) => o.aulaName === aulaName);
  if (!occurrence) throw new Error(`A aula ${aulaName} não apareceu nas ocorrências de hoje.`);
  return occurrence.id;
}

export async function bookViaApi(student: Token, ocorrenciaId: string): Promise<{ bookingId: string; status: string }> {
  return api(student, "POST", "/scheduling/bookings", { ocorrenciaId, source: "App", isTrial: false, origin: null });
}
