/** The weekly e-mail summary, built from a member's notifications. Pure, so
 * testable; sending is in app/api/cron/digest/route.ts. */

export type DigestNotification = { kind: string; payload: { title?: string; loanedTo?: string; barcode?: string }; created_at: string };

const T = {
  nl: {
    subject: (n: number) => `Filmory: ${n} ${n === 1 ? "nieuwe melding" : "nieuwe meldingen"} deze week`,
    hello: (name: string | null) => (name ? `Hoi ${name},` : "Hoi,"),
    intro: "Dit gebeurde er de afgelopen week in je Filmory:",
    approved: (t: string) => `Je barcode voor ${t} is goedgekeurd en staat in je collectie.`,
    rejected: (t: string) => `Je barcode voor ${t} is niet goedgekeurd.`,
    loan: (t: string, who: string) => `${t} is al ruim een maand uitgeleend aan ${who}.`,
    news: (t: string) => `Nieuws van Filmory: ${t}`,
    other: (t: string) => `Nieuwe melding: ${t}`,
    cta: "Bekijk je meldingen",
    footer: "Je krijgt deze mail omdat je de wekelijkse samenvatting aan hebt staan. Uitzetten kan op je profiel.",
    profile: "Profiel",
  },
  en: {
    subject: (n: number) => `Filmory: ${n} new ${n === 1 ? "notification" : "notifications"} this week`,
    hello: (name: string | null) => (name ? `Hi ${name},` : "Hi,"),
    intro: "This happened in your Filmory over the past week:",
    approved: (t: string) => `Your barcode for ${t} was approved and is in your collection.`,
    rejected: (t: string) => `Your barcode for ${t} was not approved.`,
    loan: (t: string, who: string) => `${t} has been lent to ${who} for over a month.`,
    news: (t: string) => `News from Filmory: ${t}`,
    other: (t: string) => `New notification: ${t}`,
    cta: "See your notifications",
    footer: "You get this e-mail because the weekly summary is switched on. You can switch it off on your profile.",
    profile: "Profile",
  },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function buildDigest(items: DigestNotification[], opts: { name: string | null; locale: "nl" | "en"; siteUrl: string }): { subject: string; html: string; text: string } | null {
  if (items.length === 0) return null;
  const t = T[opts.locale];
  const lines = items.slice(0, 20).map((n) => {
    const title = n.payload.title ?? n.payload.barcode ?? "";
    if (n.kind === "barcode_approved") return t.approved(title);
    if (n.kind === "barcode_rejected") return t.rejected(title);
    if (n.kind === "loan_reminder") return t.loan(title, n.payload.loanedTo ?? "?");
    if (n.kind === "announcement") return t.news(title);
    return t.other(title);
  });
  const url = `${opts.siteUrl.replace(/\/$/, "")}/meldingen`;
  const profile = `${opts.siteUrl.replace(/\/$/, "")}/profile`;
  const text = [t.hello(opts.name), "", t.intro, "", ...lines.map((l) => `- ${l}`), "", `${t.cta}: ${url}`, "", t.footer, profile].join("\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1c1917;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
<p>${esc(t.hello(opts.name))}</p><p>${esc(t.intro)}</p>
<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
<p><a href="${esc(url)}" style="display:inline-block;background:#d97706;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${esc(t.cta)}</a></p>
<p style="font-size:12px;color:#78716c">${esc(t.footer)} <a href="${esc(profile)}" style="color:#78716c">${esc(t.profile)}</a></p>
</body></html>`;
  return { subject: t.subject(items.length), html, text };
}
