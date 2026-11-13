/** Seasonal moments the app nudges members about (dashboard banner).
 * Pure, so testable; dates are Dutch calendar days (yyyy-mm-dd). */

export type Season = "black_friday" | "gifts" | "wrapped";

/** Black Friday: the day after the fourth Thursday of November. */
export function blackFriday(year: number): string {
  const nov1 = new Date(Date.UTC(year, 10, 1)).getUTCDay(); // 0 = Sunday
  const firstThursday = 1 + ((4 - nov1 + 7) % 7);
  const day = firstThursday + 21 + 1;
  return `${year}-11-${String(day).padStart(2, "0")}`;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The week before Black Friday up to Cyber Monday: Black Friday. Otherwise
 * November 1 to Christmas Eve (Sinterklaas, Christmas): gifts. December 26
 * to January 15: share your year in film (wrapped). */
export function currentSeason(today: string): Season | null {
  const year = Number(today.slice(0, 4));
  if (today >= `${year}-12-26` || today <= `${year}-01-15`) return "wrapped";
  const bf = blackFriday(year);
  if (today >= addDays(bf, -7) && today <= addDays(bf, 3)) return "black_friday";
  if (today >= `${year}-11-01` && today <= `${year}-12-24`) return "gifts";
  return null;
}

/** Which year the wrapped season is about: in January, last year. */
export function wrappedYear(today: string): number {
  const year = Number(today.slice(0, 4));
  return today.slice(5, 7) === "01" ? year - 1 : year;
}
