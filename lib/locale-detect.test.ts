import { describe, expect, it } from "vitest";
import { detectLocale, parseAcceptLanguage } from "@/lib/locale-detect";

describe("parseAcceptLanguage", () => {
  it("sorts by q and drops wildcards", () => {
    expect(parseAcceptLanguage("en;q=0.5,nl-NL,*;q=0.1")).toEqual([
      { lang: "nl", q: 1 },
      { lang: "en", q: 0.5 },
    ]);
    expect(parseAcceptLanguage(null)).toEqual([]);
  });
});

describe("detectLocale", () => {
  it("gives bots Dutch", () => {
    expect(detectLocale({ country: "US", acceptLanguage: "en", userAgent: "Googlebot/2.1" })).toBe("nl");
  });

  it("keeps an English browser in the Netherlands Dutch", () => {
    expect(detectLocale({ country: "NL", acceptLanguage: "en-US,en;q=0.9" })).toBe("nl");
  });

  it("gives a French-speaking Belgian English", () => {
    expect(detectLocale({ country: "BE", acceptLanguage: "fr-BE,fr;q=0.9" })).toBe("en");
  });

  it("gives a Dutch person abroad Dutch, others English", () => {
    expect(detectLocale({ country: "ES", acceptLanguage: "nl,en;q=0.8" })).toBe("nl");
    expect(detectLocale({ country: "ES", acceptLanguage: "es,en;q=0.8" })).toBe("en");
  });

  it("falls back to the browser when the country is unknown", () => {
    expect(detectLocale({ acceptLanguage: "en,nl;q=0.3" })).toBe("nl");
    expect(detectLocale({ acceptLanguage: "de" })).toBe("en");
    expect(detectLocale({})).toBe("nl");
  });
});
