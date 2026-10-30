import { z } from "zod";

/** Input checks for Server Actions. A Server Action is a public endpoint:
 * anyone signed in can call it with any payload, whatever the TypeScript
 * types say. These schemas keep only the known fields (unknown ones are
 * dropped) and bound their sizes before anything reaches the database. */

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));

export const profileUpdateSchema = z.object({
  name: text(60),
  bio: text(500),
  location: text(80),
  website: text(200).refine((v) => v === null || /^https?:\/\//i.test(v) || !v.includes(":"), "website"),
  avatar_url: text(500).refine((v) => v === null || /^https:\/\//i.test(v), "avatar_url"),
});

const condition = z.enum(["Nieuw", "Gebruikt", "Beschadigd"]);
const tag = z.string().trim().min(1).max(40);

export const bulkPatchSchema = z.object({
  addTags: z.array(tag).max(20).optional(),
  removeTags: z.array(tag).max(20).optional(),
  condition: condition.nullable().optional(),
  location: z.string().trim().max(80).nullable().optional(),
  forTrade: z.enum(["sale", "trade", "both"]).nullable().optional(),
  addToCollectionId: z.string().uuid().optional(),
  removeFromCollection: z.boolean().optional(),
});

const nullableString = (max: number) => z.string().max(max).nullable();

/** A collection_items row as handed back by "undo": only real columns. */
export const restoreRowSchema = z.object({
  id: z.string().uuid(),
  collection_id: z.string().uuid(),
  item_group_id: z.string().uuid(),
  tmdb_movie_id: z.number().int(),
  movie_title: z.string().max(500),
  movie_poster: nullableString(300),
  barcode: nullableString(64),
  added_at: z.string().max(40).nullable().optional(),
  type: nullableString(60),
  rating: z.number().nullable(),
  watched: z.boolean().nullable(),
  editie: nullableString(120),
  seasons: z.array(z.number().int()).nullable().optional(),
  custom_cover_path: nullableString(300).optional(),
  cut: nullableString(120).optional(),
  audio_languages: z.array(z.string().max(20)).nullable().optional(),
  subtitle_languages: z.array(z.string().max(20)).nullable().optional(),
  label: nullableString(120).optional(),
  region: nullableString(20).optional(),
  purchase_price: z.number().nullable().optional(),
  purchase_date: nullableString(20).optional(),
  purchase_shop: nullableString(120).optional(),
  for_trade: z.enum(["sale", "trade", "both"]).nullable().optional(),
  shelf_location: nullableString(80).optional(),
  is_box: z.boolean().nullable(),
  box_group_id: z.string().uuid().nullable(),
  box_name: nullableString(200),
  personal_note: nullableString(2000),
  loaned_to: nullableString(120),
  loaned_at: nullableString(40),
  is_favorite: z.boolean().nullable(),
  tags: z.array(z.string().max(40)).nullable(),
  condition: condition.nullable(),
});
