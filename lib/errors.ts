/** Plain (non-"use server") module for error classes shared between server
 * actions (which throw them) and client components (which catch/instanceof-
 * check them). A "use server" file may only export async functions — a
 * class export there breaks the client bundle (hit for real earlier this
 * session with a stray `export type` and a stray `export const` in
 * actions/auth.ts and actions/badges.ts; same rule applies to classes). */
export class BarcodeAlreadyRegisteredError extends Error {
  existingTmdbMovieId: number;
  constructor(existingTmdbMovieId: number) {
    super("barcode_already_registered");
    this.existingTmdbMovieId = existingTmdbMovieId;
  }
}
