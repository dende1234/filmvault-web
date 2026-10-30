import { describe, expect, it } from "vitest";
import { isValidEanUpc, normalizeBarcode } from "@/lib/barcode";

describe("normalizeBarcode", () => {
  it("strips separators and spreadsheet artefacts", () => {
    expect(normalizeBarcode(" 8 712609-650.123 ")).toBe("8712609650123");
    expect(normalizeBarcode("#043396304468")).toBe("043396304468");
    expect(normalizeBarcode("'5051892")).toBe("5051892");
  });

  it("keeps letters (never rejects)", () => {
    expect(normalizeBarcode("ABC-123")).toBe("ABC123");
  });
});

describe("isValidEanUpc", () => {
  it("accepts valid EAN-13, UPC-A and EAN-8", () => {
    expect(isValidEanUpc("4006381333931")).toBe(true);
    expect(isValidEanUpc("036000291452")).toBe(true);
    expect(isValidEanUpc("96385074")).toBe(true);
  });

  it("rejects a wrong check digit, other lengths and non-digits", () => {
    expect(isValidEanUpc("4006381333932")).toBe(false);
    expect(isValidEanUpc("12345")).toBe(false);
    expect(isValidEanUpc("40063813339AB")).toBe(false);
  });
});
