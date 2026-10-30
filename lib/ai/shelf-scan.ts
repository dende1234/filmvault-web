import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Reads the titles off a photo of a DVD/Blu-ray shelf. One vision call with a
// structured-output schema; matching to TMDB and adding to a collection stay
// in the existing import pipeline (actions/import.ts). ANTHROPIC_API_KEY is
// server-only and only needed at runtime, so builds work without it.

const MODEL = "claude-opus-5-5";

const ShelfItemSchema = z.object({
  title: z.string(),
  year: z.string().nullable(),
  kind: z.enum(["movie", "tv", "unknown"]),
  format: z.enum(["dvd", "bluray", "4k", "unknown"]),
  is_box: z.boolean(),
  confidence: z.enum(["high", "low"]),
});

const ShelfScanSchema = z.object({ items: z.array(ShelfItemSchema) });

export type ShelfItem = z.infer<typeof ShelfItemSchema>;

const SYSTEM = `You read the spines and covers in a photo of someone's film collection (DVD, Blu-ray, 4K UHD, box sets) so they can be added to a collection app.

Return one item per physical case, in shelf order (left to right, top to bottom).
- title: the film or series title as printed. Keep the original language (Dutch and English titles are both common); drop edition words like "Steelbook" or "Special Edition" from the title.
- year: only when a year is printed on the case, otherwise null. Never guess.
- kind: "tv" for a TV series or season set, "movie" for a film, "unknown" if you can't tell.
- format: from the case colour and logos (blue Blu-ray band, black 4K UHD band, DVD logo); "unknown" if unclear.
- is_box: true for a box set holding several films or seasons.
- confidence: "low" when the text is partly unreadable or you are unsure of the title.

Skip cases whose title you cannot read at all, and anything that is not a film or series (books, games, CDs). Never invent titles.`;

export class ShelfScanUnavailableError extends Error {
  constructor() {
    super("shelf_scan_unavailable");
  }
}

export async function scanShelfPhoto(image: Buffer, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<ShelfItem[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new ShelfScanUnavailableError();
  const client = new Anthropic();

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ShelfScanSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image.toString("base64") } },
          { type: "text", text: "List the films and series on this shelf." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) return [];
  return response.parsed_output.items.filter((i) => i.title.trim());
}
