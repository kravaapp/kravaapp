/** Chave de comparação para níveis com ou sem acento retornados pela API. */
export const normalizeStudentLevel = (level?: string | null) =>
  (level ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function getStudentLevelWeight(level?: string | null) {
  switch (normalizeStudentLevel(level)) {
    case "iniciante": return 1;
    case "intermediario": return 2;
    case "avancado": return 3;
    default: return 0;
  }
}
