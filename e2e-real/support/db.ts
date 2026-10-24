import { execFileSync } from "node:child_process";

export const POSTGRES_CONTAINER = "krava-e2e-postgres";

/** Roda SQL no Postgres do E2E (docker-compose deste diretório) e devolve a saída sem cabeçalho. */
export function sql(query: string): string {
  return execFileSync(
    "docker",
    ["exec", "-i", POSTGRES_CONTAINER, "psql", "-q", "-v", "ON_ERROR_STOP=1", "-U", "krava", "-d", "krava", "-tA"],
    { input: query, encoding: "utf8" },
  ).trim();
}

/** Literal SQL entre aspas simples. */
export const lit = (value: string) => `'${value.replace(/'/g, "''")}'`;
