/** Plain (non-"use server") barcode helpers, shared by the admin client
 * components and the server actions that re-validate their input. */

/** Strips the separators people tend to type or paste along with a code
 * (spaces, dashes, dots). Letters are kept — not every registered barcode
 * is a pure EAN/UPC, so this must never reject, only tidy up. */
export function normalizeBarcode(raw: string): string {
  return raw.trim().replace(/[\s.\-]/g, "");
}

/** GS1 check-digit validation for EAN-8, UPC-A (12) and EAN-13. Anything
 * else (other lengths, non-digits) returns false; callers treat that as a
 * warning, not a hard error. */
export function isValidEanUpc(code: string): boolean {
  if (!/^\d+$/.test(code) || ![8, 12, 13].includes(code.length)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  // Weights alternate 3,1,3,... starting from the digit right before the check digit.
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
