import { createHash, randomBytes } from "node:crypto";

/** Personal MCP tokens (mcp_tokens.sql): "fvm_" + 32 random bytes. Only the
 * SHA-256 is stored; the hint ("fvm_ab12…") helps a member recognise it. */
export const TOKEN_PREFIX = "fvm_";

export function generateMcpToken(): { token: string; hash: string; hint: string } {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  return { token, hash: hashMcpToken(token), hint: `${token.slice(0, 8)}…` };
}

export function hashMcpToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** "Bearer fvm_…" → the token, or null for anything else. */
export function tokenFromAuthHeader(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(fvm_[A-Za-z0-9_-]{40,60})\s*$/);
  return match ? match[1] : null;
}
