import "server-only";

/** Transactional mail through Brevo (same account as the newsletter, see
 * lib/newsletter.ts). Needs BREVO_API_KEY and BREVO_SENDER_EMAIL (a sender
 * verified in Brevo); without them nothing is sent. */
export function isEmailConfigured() {
  return !!process.env.BREVO_API_KEY && !!process.env.BREVO_SENDER_EMAIL;
}

export async function sendEmail(to: { email: string; name?: string | null }, subject: string, html: string, text: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME || "Filmory" },
        to: [{ email: to.email, ...(to.name ? { name: to.name } : {}) }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[email] send failed", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}
