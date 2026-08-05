// Hand-written TypeScript mirrors of the Android app's Kotlin @Serializable
// data classes (Fase 1 tables only) — column names match the Postgres schema
// exactly (snake_case), same as the Kotlin @SerialName annotations.

export type MediaType = "Blu-ray" | "DVD" | "VHS" | "4K Ultra HD";
// Single source of truth for the "Type" dropdown — order matches the
// Android app's BARCODE_TYPES/ADMIN_ADD_FILM_TYPES/etc. exactly.
export const MEDIA_TYPES: MediaType[] = ["Blu-ray", "DVD", "VHS", "4K Ultra HD"];
// Single source of truth for the "Editie" dropdown — matches Android's
// AddToCollectionDialog.kt's EDITIE_OPTIONS exactly (also a fixed dropdown
// there, not free text).
export const EDITIE_OPTIONS = [
  "Normaal",
  "Steelbook",
  "Collector's Edition",
  "Limited Edition",
  "Director's Cut",
  "Extended Edition",
  "Special Edition",
] as const;
export type Condition = "Nieuw" | "Gebruikt" | "Beschadigd";
export type ThemePreference = "light" | "dark" | "system";
export type Language = "nl" | "en";

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_admin: boolean;
  theme_preference: ThemePreference | null;
  language: Language | null;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string | null;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  item_group_id: string;
  tmdb_movie_id: number;
  movie_title: string;
  movie_poster: string | null;
  barcode: string;
  added_at: string | null;
  type: MediaType;
  rating: number | null;
  watched: boolean;
  editie: string;
  is_box: boolean;
  box_group_id: string | null;
  box_name: string | null;
  personal_note: string | null;
  loaned_to: string | null;
  loaned_at: string | null;
  is_favorite: boolean;
  tags: string[];
  condition: Condition | null;
}

const LOAN_OVERDUE_DAYS = 30;

/** True if item has been loaned out for more than LOAN_OVERDUE_DAYS. Compares only the
 * yyyy-MM-dd date prefix of loaned_at lexically against a cutoff date string — mirrors
 * CollectionItem.kt's isLoanOverdue exactly (same reasoning: no need for a full date-parsing
 * library just for a day-threshold comparison). */
export function isLoanOverdue(item: Pick<CollectionItem, "loaned_to" | "loaned_at">): boolean {
  if (!item.loaned_to || !item.loaned_at) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOAN_OVERDUE_DAYS);
  const cutoffDateString = cutoff.toISOString().slice(0, 10);
  return item.loaned_at.slice(0, 10) < cutoffDateString;
}

export interface Barcode {
  id: string;
  tmdb_movie_id: number;
  barcode: string;
  created_at: string | null;
  type: MediaType;
  editie: string;
  is_box: boolean;
  box_group_id: string | null;
  box_name: string | null;
}

export type PendingBarcodeStatus = "pending" | "approved" | "rejected";

export interface PendingBarcode {
  id: string;
  tmdb_movie_id: number;
  movie_title: string;
  movie_poster: string | null;
  barcode: string;
  type: MediaType | null;
  editie: string | null;
  submitted_by: string;
  submitted_at: string | null;
  collection_id: string;
  status: PendingBarcodeStatus;
  is_box: boolean;
  box_group_id: string | null;
  box_name: string | null;
}

export interface PendingBarcodeCollectionRow {
  pending_barcode_id: string;
  collection_id: string;
}

/** Staged, not-yet-submitted new barcode (client-only, mirrors NewBarcodeInput). */
export interface NewBarcodeInput {
  barcode: string;
  type: MediaType;
  editie: string;
}

/** One film picked for a new box (client-only, mirrors BoxFilmInput). */
export interface BoxFilmInput {
  tmdb_movie_id: number;
  movie_title: string;
  movie_poster: string | null;
}

// --- Fase 2: Vrienden & Badges ---

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string | null;
  updated_at: string | null;
}

/** Safe public subset — mirrors search_profiles/get_public_profiles RPCs
 * (never email/is_admin/bio/etc). */
export interface ProfileSearchResult {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

export interface FriendRequestWithProfile {
  request: FriendRequest;
  otherProfile: ProfileSearchResult;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string | null;
}

// --- "Extensions" round Fase 4: Verlanglijst (wishlist) ---
// Owner-only (supabase/sql/wishlist.sql) — deliberately not visible to
// friends, unlike collections. Mirrors wishlist/WishlistItem.kt exactly.
export interface WishlistItem {
  id: string;
  user_id: string;
  tmdb_movie_id: number;
  movie_title: string;
  movie_poster: string | null;
  added_at: string | null;
}

/** Mirrors badges/BadgeId.kt exactly — id + i18n key pair, same 11 fixed
 * badges and thresholds (7 original + 4 added in the "extensions" round). */
export const BADGE_IDS = [
  { id: "first_collection", titleKey: "badge_first_collection_title", descKey: "badge_first_collection_desc" },
  { id: "five_collections", titleKey: "badge_five_collections_title", descKey: "badge_five_collections_desc" },
  { id: "first_film", titleKey: "badge_first_film_title", descKey: "badge_first_film_desc" },
  { id: "ten_films", titleKey: "badge_ten_films_title", descKey: "badge_ten_films_desc" },
  { id: "fifty_films", titleKey: "badge_fifty_films_title", descKey: "badge_fifty_films_desc" },
  { id: "first_friend", titleKey: "badge_first_friend_title", descKey: "badge_first_friend_desc" },
  { id: "five_friends", titleKey: "badge_five_friends_title", descKey: "badge_five_friends_desc" },
  { id: "hundred_films", titleKey: "badge_hundred_films_title", descKey: "badge_hundred_films_desc" },
  { id: "ten_friends", titleKey: "badge_ten_friends_title", descKey: "badge_ten_friends_desc" },
  { id: "first_review", titleKey: "badge_first_review_title", descKey: "badge_first_review_desc" },
  { id: "generous_lender", titleKey: "badge_generous_lender_title", descKey: "badge_generous_lender_desc" },
] as const;

// --- Fase 3: Curated lijsten ---

export interface CuratedList {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string | null;
}

export interface CuratedListItem {
  id: string;
  list_id: string;
  tmdb_movie_id: number;
  movie_title: string;
  movie_poster: string | null;
  added_at: string | null;
}

export interface CuratedListSubscription {
  id: string;
  list_id: string;
  user_id: string;
  subscribed_at: string | null;
}

export interface CuratedListUiItem {
  list: CuratedList;
  totalCount: number;
  ownedCount: number;
  isMine: boolean;
  isSubscribed: boolean;
}

// --- Fase 4: Sociaal (volgen, berichten, publiek profiel) ---

export interface Follow {
  id: string;
  follower_id: string;
  followee_id: string;
  created_at: string | null;
}

export interface Post {
  id: string;
  author_id: string;
  title: string | null;
  body: string;
  tmdb_movie_id: number | null;
  movie_title: string | null;
  movie_poster: string | null;
  rating: number | null;
  created_at: string | null;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string | null;
}

/** Safe subset of `profiles` returned by the get_public_profile_details RPC —
 * deliberately excludes email/is_admin/theme_preference/language. */
export interface PublicProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
}

export interface FeedPostUiItem {
  post: Post;
  authorName: string | null;
  authorAvatarUrl: string | null;
}

// --- Fase 5: Admin ---

export interface AdminProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string | null;
}

export interface AdminStats {
  total_users: number;
  total_collections: number;
  total_collection_items: number;
  total_posts: number;
  total_comments: number;
  total_follows: number;
  total_curated_lists: number;
  pending_approvals: number;
}

export type ContentType = "post" | "comment" | "curated_list";
export type ContentReportStatus = "open" | "resolved" | "dismissed";

export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: ContentType;
  content_id: string;
  reason: string | null;
  status: ContentReportStatus;
  created_at: string | null;
}

export interface AdminReportUiItem {
  report: ContentReport;
  preview: string;
  /** For a post/comment report, the post id to open; for a curated-list report, the list id. */
  navigateTargetId: string | null;
}

export interface PendingBarcodeUiItem {
  pending: PendingBarcode;
  targetCollectionNames: string[];
}

/** One admin-approval card — either a single film, or a box's several film
 * rows grouped by their shared box_group_id (approved/rejected together as
 * one unit). Mirrors PendingBarcodeCardItem.kt's sealed class. */
export type PendingBarcodeCardItem =
  | { kind: "single"; id: string; pendingIds: string[]; item: PendingBarcodeUiItem }
  | { kind: "box"; id: string; pendingIds: string[]; boxName: string; items: PendingBarcodeUiItem[] };
