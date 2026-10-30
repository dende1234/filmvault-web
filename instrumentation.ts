import type { Instrumentation } from "next";

/** Server errors (pages, route handlers, server actions, proxy) go to
 * app_errors, shown on /admin/status. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { reportError } = await import("@/lib/report-error");
  const message = err instanceof Error ? err.message : String(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null;
  const ua = request.headers["user-agent"];
  await reportError({
    source: "server",
    message,
    digest,
    path: request.path.split("?")[0],
    context: `${context.routeType} ${context.routePath}`,
    userAgent: Array.isArray(ua) ? ua[0] : ua,
  });
};
