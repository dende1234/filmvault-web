"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/actions/notifications";

/** On the notifications page: mark everything read once it is shown, then
 * refresh so the menu badge clears (the layout doesn't re-render on its own). */
export function MarkNotificationsRead() {
  const router = useRouter();
  useEffect(() => {
    markNotificationsRead()
      .then(() => router.refresh())
      .catch(() => {});
  }, [router]);
  return null;
}
