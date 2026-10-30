// Hand-written TypeScript mirrors of the Android app's Kotlin @Serializable
// data classes (Fase 1 tables only) — column names match the Postgres schema
// exactly (snake_case), same as the Kotlin @SerialName annotations.

// type/editie are plain strings, not a fixed union — both are admin-managed
// lookup lists (media_types/edities tables, see actions/media-types.ts),
// not a compile-time-fixed set. Fetch the current options with
// getMediaTypes()/getEdities() rather than importing a hardcoded list.
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
  /** E-mail consent (growth_tracking.sql). Absent until that migration runs. */
  newsletter_opt_in?: boolean;
  newsletter_opt_in_at?: string | null;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string | null;
  /** "Openbaar via link" (public_collections.sql). Absent until that migration runs. */
  is_public?: boolean;
}

/** Safe, read-only projection returned by the get_public_collection RPC —
 * no personal fields (notes, loans, ratings, condition, barcode). */
export interface PublicCollection {
  id: string;
  name: string;
  description: string | null;
  owner_name: string | null;
  owner_avatar_url: string | null;
  items: {
    tmdb_movie_id: number;
    movie_title: string;
    movie_poster: string | null;
    type: string;
    editie: string;
    seasons?: number[] | null;
    custom_cover_path?: string | null;
    is_box: boolean;
    /** Present once public_collection_boxes.sql has run. */
    box_group_id?: string | null;
    box_name: string | null;
  }[];
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
  type: string;
  rating: number | null;
  watched: boolean;
  editie: string;
  /** Series only: season numbers in this release (series_support.sql). */
  seasons?: number[] | null;
  /** Own cover photo for this copy (custom_covers.sql), storage path. */
  custom_cover_path?: string | null;
  /** Per-copy details (copy_details.sql): cut, ISO 639-1 language codes, label. */
  cut?: string | null;
  audio_languages?: string[] | null;
  subtitle_languages?: string[] | null;
  label?: string | null;
  /** Region code (contributors_region.sql): "B", "2/4", "Regiovrij". */
  region?: string | null;
  /** Purchase details (purchase_details.sql). numeric comes back as a number. */
  purchase_price?: number | null;
  purchase_date?: string | null;
  purchase_shop?: string | null;
  /** Ruillijst (trade_list.sql). */
  for_trade?: "sale" | "trade" | "both" | null;
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
  type: string;
  editie: string;
  /** Series only: season numbers in this release (series_support.sql). */
  seasons?: number[] | null;
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
  type: string | null;
  editie: string | null;
  /** Series only: season numbers in this release (series_support.sql). */
  seasons?: number[] | null;
  /** Per-copy details carried to the collection on approval (copy_details.sql). */
  cut?: string | null;
  audio_languages?: string[] | null;
  subtitle_languages?: string[] | null;
  label?: string | null;
  region?: string | null;
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
  type: string;
  editie: string;
  /** Series only: season numbers in this release (series_support.sql). */
  seasons?: number[] | null;
  /** Cut, languages and label to put on the copy (copy_details.sql). */
  details?: import("@/lib/copy-details").CopyDetailsInput | null;
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
  /** Series only: the wanted seasons (null = the whole series). */
  seasons?: number[] | null;
  /** "Holy Grail": what you hunt most (collector_extras.sql). */
  is_grail?: boolean;
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
  // Barcode contributors (contributors_region.sql widens the CHECK on user_badges).
  { id: "first_barcode", titleKey: "badge_first_barcode_title", descKey: "badge_first_barcode_desc" },
  { id: "ten_barcodes", titleKey: "badge_ten_barcodes_title", descKey: "badge_ten_barcodes_desc" },
  { id: "fifty_barcodes", titleKey: "badge_fifty_barcodes_title", descKey: "badge_fifty_barcodes_desc" },
  // Invites that led to a signup (invite_rewards.sql).
  { id: "first_invite", titleKey: "badge_first_invite_title", descKey: "badge_first_invite_desc" },
  { id: "five_invites", titleKey: "badge_five_invites_title", descKey: "badge_five_invites_desc" },
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
  /** First few films' posters, for the card collage. */
  previewPosters: { path: string | null; title: string }[];
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
  isSeen: boolean;
}

/** All feed posts (self + followees, seen and unseen alike) plus which of them are already
 * seen — the UI layer partitions on seenPostIds to show unseen posts first, then an
 * "Eerder gezien" divider, then the rest. Mirrors PostRepository.FeedResult on Android. */
export interface FeedResult {
  posts: Post[];
  seenPostIds: string[];
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
  /** Who submitted it (profiles; admins can read every profile). */
  submitter?: { id: string; name: string | null; email: string | null } | null;
  /** The submitter's track record: trusted = many approved, none rejected. */
  submitterStats?: { approved: number; rejected: number; trusted: boolean } | null;
  /** The same barcode is already registered for OTHER titles (not a box). */
  conflicts?: number[];
}

/** One admin-approval card — either a single film, or a box's several film
 * rows grouped by their shared box_group_id (approved/rejected together as
 * one unit). Mirrors PendingBarcodeCardItem.kt's sealed class. */
export type PendingBarcodeCardItem =
  | { kind: "single"; id: string; pendingIds: string[]; item: PendingBarcodeUiItem }
  | { kind: "box"; id: string; pendingIds: string[]; boxName: string; items: PendingBarcodeUiItem[] };

// --- "Bekeken" module (watched_films.sql) ---

/** One per user per film — the source of truth for watched, rating and the
 * (private) review. collection_items.watched/rating mirror it via triggers. */
export interface FilmLog {
  id: string;
  user_id: string;
  tmdb_movie_id: number;
  movie_title: string;
  movie_poster: string | null;
  watched: boolean;
  rating: number | null;
  review: string | null;
  review_post_id: string | null;
  created_at: string;
  updated_at: string;
}

/** One diary entry. watched_on null = date unknown. */
export interface FilmViewing {
  id: string;
  user_id: string;
  tmdb_movie_id: number;
  watched_on: string | null;
  /** Series only: which season this viewing was (null = whole title). */
  season_number?: number | null;
  created_at: string;
}

export interface WatchedFilmItem extends FilmLog {
  viewingCount: number;
  lastWatchedOn: string | null;
  inCollection: boolean;
}

export interface DiaryEntry extends FilmViewing {
  movie_title: string;
  movie_poster: string | null;
  rating: number | null;
  /** True when this isn't the earliest viewing of the film (a rewatch). */
  isRewatch: boolean;
}

export type FilmMeta = { tmdbMovieId: number; title: string; poster: string | null };

export type FeedbackKind = "bug" | "idea" | "other";
export type FeedbackStatus = "new" | "in_progress" | "planned" | "done" | "declined";

/** user_feedback (FilmVault/supabase/sql/user_feedback.sql). user_id is null
 * for visitors without an account; ip_hash is never selected by the app. */
export interface UserFeedback {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  kind: FeedbackKind;
  message: string;
  contact_email: string | null;
  page: string | null;
  user_agent: string | null;
  viewport: string | null;
  locale: string | null;
  app_version: string | null;
  screenshot_path: string | null;
  status: FeedbackStatus;
  admin_reply: string | null;
}

/** user_notifications (contributors_region.sql). */
export interface UserNotification {
  id: string;
  kind: "barcode_approved" | "barcode_rejected" | "loan_reminder";
  payload: {
    title?: string;
    /** loan_reminder (loan_reminders.sql) */
    loanedTo?: string;
    loanedAt?: string;
    collectionId?: string;
    itemId?: string;
    poster?: string | null;
    barcode?: string;
    isBox?: boolean;
    tmdbMovieId?: number;
    boxGroupId?: string | null;
    collectionIds?: string[];
  };
  created_at: string;
  read_at: string | null;
}
