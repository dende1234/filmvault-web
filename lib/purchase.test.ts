import { describe, expect, it } from "vitest";
import { parsePrice, purchaseColumns, totalValue } from "@/lib/purchase";

describe("parsePrice", () => {
  it("reads European and English notations", () => {
    expect(parsePrice("€ 12,99")).toBe(12.99);
    expect(parsePrice("12.99")).toBe(12.99);
    expect(parsePrice("1.299,00")).toBe(1299);
    expect(parsePrice("1,299.5")).toBe(1299.5);
    expect(parsePrice("EUR 15")).toBe(15);
    expect(parsePrice("7,5")).toBe(7.5);
  });

  it("rejects empty, negative and absurd values", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("gratis")).toBeNull();
    expect(parsePrice("-5")).toBeNull();
    expect(parsePrice("1000000")).toBeNull();
  });
});

describe("purchaseColumns", () => {
  it("only sends what is set and valid", () => {
    expect(purchaseColumns({ price: 9.999, date: "2026-10-01", shop: "  Bol.com " })).toEqual({
      purchase_price: 10,
      purchase_date: "2026-10-01",
      purchase_shop: "Bol.com",
    });
    expect(purchaseColumns({ price: null, date: "01-10-2026", shop: "" })).toEqual({});
    expect(purchaseColumns(null)).toEqual({});
  });
});

describe("totalValue", () => {
  it("counts each physical copy once", () => {
    expect(
      totalValue([
        { item_group_id: "a", purchase_price: 10 },
        { item_group_id: "a", purchase_price: 10 },
        { item_group_id: "b", purchase_price: 5.5 },
        { item_group_id: "c", purchase_price: null },
      ]),
    ).toEqual({ total: 15.5, priced: 2 });
  });
});
