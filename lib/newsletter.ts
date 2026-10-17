import "server-only";

// The newsletter itself lives in Brevo (sending, unsubscribe links, layout,
// statistics). This adapter keeps the Brevo list in step with Filmory: members
// who tick the box are added directly (their email is confirmed and consent
// was explicit), visitors without an account get Brevo's double opt-in mail.
// Unsubscribes made in an email come back through the newsletter-webhook Edge
// Function (FilmVault/supabase/functions/newsletter-webhook).
//
// Without BREVO_API_KEY every call is a no-op ("not_configured"), so local dev
// and the time before Brevo is set up never break registration or profiles.
// Swapping provider means replacing this file only.

const API = "https://api.brevo.com/v3";

export type NewsletterResult = "ok" | "not_configured" | "error";

function config() {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  const doiTemplateId = Number(process.env.BREVO_DOI_TEMPLATE_ID);
  if (!apiKey || !Number.isInteger(listId) || listId <= 0) return null;
  return { apiKey, listId, doiTemplateId: Number.isInteger(doiTemplateId) && doiTemplateId > 0 ? doiTemplateId : null };
}

export function isNewsletterConfigured() {
  return config() !== null;
}

async function call(apiKey: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${API}${path}`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

async function log(label: string, res: Response) {
  const text = await res.text().catch(() => "");
  console.error(`[newsletter] ${label} failed: ${res.status} ${text.slice(0, 300)}`);
}

/** Member opted in: create or update the contact and put it on the list. */
export async function upsertMember(email: string, name?: string | null): Promise<NewsletterResult> {
  const cfg = config();
  if (!cfg) return "not_configured";
  try {
    const base = {
      email,
      listIds: [cfg.listId],
      updateEnabled: true,
      // Opted in again after an earlier unsubscribe: lift Brevo's block.
      emailBlacklisted: false,
    };
    let res = await call(cfg.apiKey, "/contacts", name?.trim() ? { ...base, attributes: { FIRSTNAME: name.trim() } } : base);
    // The name is a nicety: if the account has no FIRSTNAME attribute, retry without it.
    if (res.status === 400 && name?.trim()) res = await call(cfg.apiKey, "/contacts", base);
    if (res.ok) return "ok";
    await log("upsertMember", res);
    return "error";
  } catch (e) {
    console.error("[newsletter] upsertMember failed", e);
    return "error";
  }
}

/** Member opted out (profile toggle or account deletion): off the list. */
export async function removeMember(email: string): Promise<NewsletterResult> {
  const cfg = config();
  if (!cfg) return "not_configured";
  try {
    const res = await call(cfg.apiKey, `/contacts/lists/${cfg.listId}/contacts/remove`, { emails: [email] });
    // 400/404 here mostly means "not on the list": nothing to remove.
    if (res.ok || res.status === 400 || res.status === 404) return "ok";
    await log("removeMember", res);
    return "error";
  } catch (e) {
    console.error("[newsletter] removeMember failed", e);
    return "error";
  }
}

/** Visitor without an account: Brevo sends the confirmation mail and only
 * adds the address to the list after the click. */
export async function startDoubleOptIn(email: string, redirectionUrl: string): Promise<NewsletterResult> {
  const cfg = config();
  if (!cfg || !cfg.doiTemplateId) return "not_configured";
  try {
    const res = await call(cfg.apiKey, "/contacts/doubleOptinConfirmation", {
      email,
      includeListIds: [cfg.listId],
      templateId: cfg.doiTemplateId,
      redirectionUrl,
    });
    if (res.ok) return "ok";
    await log("startDoubleOptIn", res);
    return "error";
  } catch (e) {
    console.error("[newsletter] startDoubleOptIn failed", e);
    return "error";
  }
}
