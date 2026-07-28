import { nl } from "./nl";
import { en } from "./en";

export type Locale = "nl" | "en";
export type Dictionary = typeof nl;

const dictionaries: Record<Locale, Dictionary> = { nl, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.nl;
}

/** Replaces {0}, {1}, ... placeholders — the same positional-parameter idea as
 * Android's %1$s/%1$d, just 0-indexed and type-agnostic. */
export function format(template: string, ...args: Array<string | number>): string {
  return template.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}
