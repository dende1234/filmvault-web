import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { FEATURES, featureEnabled, type FeatureFlag } from "@/lib/feature-rules";
import { hashMcpToken, tokenFromAuthHeader } from "@/lib/mcp/token";
import { buildFilmoryMcpServer } from "@/lib/mcp/server";

// The Filmory MCP server (fase 1: read-only member tools). A member connects
// an AI assistant with a personal token from their profile (mcp_tokens.sql):
// "Authorization: Bearer fvm_…". Stateless Streamable HTTP with JSON
// responses, so it runs as a plain serverless function. Excluded from the
// proxy (proxy.ts): no cookies, the token is the login.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function jsonRpcError(status: number, code: number, message: string, headers: Record<string, string> = {}) {
  return Response.json({ jsonrpc: "2.0", error: { code, message }, id: null }, { status, headers });
}

export async function POST(request: Request) {
  const token = tokenFromAuthHeader(request.headers.get("authorization"));
  if (!token) {
    return jsonRpcError(401, -32001, "Missing or invalid token. Make one on your Filmory profile.", {
      "WWW-Authenticate": 'Bearer realm="filmory"',
    });
  }
  const db = createAdminClient();
  if (!db) return jsonRpcError(503, -32002, "Filmory MCP is not configured.");

  const { data, error } = await db.rpc("mcp_use_token", { p_token_hash: hashMcpToken(token) });
  if (error) return jsonRpcError(503, -32002, "Filmory MCP is not available yet.");
  const use = data as { status: "ok" | "invalid" | "limited"; user_id?: string; is_admin?: boolean };
  if (use.status === "limited") return jsonRpcError(429, -32003, "Too many requests, try again in an hour.");
  if (use.status !== "ok" || !use.user_id) {
    return jsonRpcError(401, -32001, "This token is unknown or revoked.", { "WWW-Authenticate": 'Bearer error="invalid_token"' });
  }

  // Behind the "mcp" switch (/admin/features), like the shelf scan.
  const { data: row } = await db.from("feature_flags").select("key, mode, percent, user_ids").eq("key", "mcp").maybeSingle();
  const flag = (row as FeatureFlag | null) ?? { key: "mcp", mode: FEATURES.find((f) => f.key === "mcp")!.defaultMode, percent: 0, user_ids: [] };
  if (!featureEnabled(flag, use.user_id, !!use.is_admin)) return jsonRpcError(403, -32004, "Filmory MCP isn't switched on for you yet.");

  const server = buildFilmoryMcpServer(db, use.user_id);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}

// Stateless: no server-sent event stream and no sessions to end.
export function GET() {
  return jsonRpcError(405, -32000, "Method not allowed.", { Allow: "POST" });
}

export function DELETE() {
  return jsonRpcError(405, -32000, "Method not allowed.", { Allow: "POST" });
}
