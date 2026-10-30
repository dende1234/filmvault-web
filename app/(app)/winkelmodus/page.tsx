import { redirect } from "next/navigation";

/** Moved into /scannen; kept for bookmarks and older links. */
export default function ShopModePage() {
  redirect("/scannen?modus=winkel");
}
