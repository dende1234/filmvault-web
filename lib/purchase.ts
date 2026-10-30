/** Purchase details per copy (purchase_details.sql): price, date, shop.
 * Plain module, shared by the editor, the import and the print overview. */

export type PurchaseInput = {
  price?: number | null;
  /** YYYY-MM-DD */
  date?: string | null;
  shop?: string | null;
};

const MAX_PRICE = 99999.99;

/** "€ 12,99", "12.99", "1.299,00", "EUR 15", "$9.99" → 12.99 / 1299 / 15 / 9.99.
 * The last "," or "." followed by one or two digits is the decimal separator;
 * other separators are thousands. Anything unreadable → null. */
export function parsePrice(text: string | null | undefined): number | null {
  const v = (text ?? "").replace(/[^\d.,-]/g, "");
  if (!/\d/.test(v) || v.startsWith("-")) return null;
  const m = v.match(/^(.*?)[.,](\d{1,2})$/);
  const whole = (m ? m[1] : v).replace(/[.,]/g, "");
  const cents = m ? m[2].padEnd(2, "0") : "00";
  if (!/^\d*$/.test(whole)) return null;
  const n = Number(`${whole || "0"}.${cents}`);
  return Number.isFinite(n) && n <= MAX_PRICE ? Math.round(n * 100) / 100 : null;
}

/** Only the parts that are set, as collection_items columns. */
export function purchaseColumns(p: PurchaseInput | null | undefined): Record<string, unknown> {
  if (!p) return {};
  const out: Record<string, unknown> = {};
  if (p.price != null && p.price >= 0 && p.price <= MAX_PRICE) out.purchase_price = Math.round(p.price * 100) / 100;
  if (p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) out.purchase_date = p.date;
  const shop = p.shop?.trim().slice(0, 80);
  if (shop) out.purchase_shop = shop;
  return out;
}

export function formatPrice(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "en" ? "en-IE" : "nl-NL", { style: "currency", currency: "EUR" }).format(value);
}

/** Total purchase value of copies (each physical copy once). */
export function totalValue(items: { item_group_id: string; purchase_price?: number | null }[]): { total: number; priced: number } {
  const seen = new Set<string>();
  let total = 0;
  let priced = 0;
  for (const i of items) {
    if (seen.has(i.item_group_id)) continue;
    seen.add(i.item_group_id);
    if (i.purchase_price != null) {
      total += Number(i.purchase_price);
      priced++;
    }
  }
  return { total: Math.round(total * 100) / 100, priced };
}
