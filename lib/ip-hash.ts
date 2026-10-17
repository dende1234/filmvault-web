import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/** Salted SHA-256 of the caller's IP, for rate limits only: a raw IP is never
 * stored or sent anywhere. null when no IP is known (local dev). */
export async function ipHash(): Promise<string | null> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
  if (!ip) return null;
  const salt = process.env.FEEDBACK_SALT ?? "filmory-feedback";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
