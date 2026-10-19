import { Token } from "@/types/auth.types";

export const AUTH_STORAGE_KEY = "@krava:auth-state";
export const TENANT_SELECTION_STORAGE_KEY = "@krava:tenant-selection";

/** A sessão local só pode ser restaurada enquanto o token não expirou. */
export function isValidStoredToken(value: unknown): value is Token {
  if (!value || typeof value !== "object") return false;
  const token = value as Partial<Token>;
  return typeof token.accessToken === "string" && !!token.accessToken.trim()
    && typeof token.userId === "string" && !!token.userId
    && typeof token.role === "string" && !!token.role
    && typeof token.expiresAtUtc === "string"
    && Date.parse(token.expiresAtUtc) > Date.now();
}
