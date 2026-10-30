import { headers } from "next/headers";

/** Country for "Te zien bij": Belgium for Belgian visitors (Vercel's
 * x-vercel-ip-country), the Netherlands otherwise (the main audience). */
export async function watchCountry(): Promise<"NL" | "BE"> {
  const h = await headers();
  return h.get("x-vercel-ip-country")?.toUpperCase() === "BE" ? "BE" : "NL";
}
