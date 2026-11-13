import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { nl } from "@/lib/i18n/nl";
import { PublicWishlistItems } from "@/components/public-wishlist-items";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("@/actions/public-wishlist", () => ({ setPublicWishlistReservation: vi.fn() }));

const wish = { tmdb_movie_id: 42, movie_title: "A wanted film", movie_poster: null, added_at: null };
function render(overrides = {}, ready = true) {
  return renderToStaticMarkup(
    <LocaleProvider dict={nl} locale="nl">
      <PublicWishlistItems userId="owner" items={[{ ...wish, ...overrides }]} reservationsReady={ready} />
    </LocaleProvider>,
  );
}
function checkbox(html: string) {
  return html.match(/<button\b[^>]*>/g)?.find((tag) => tag.includes('role="checkbox"'));
}

describe("shared wishlist controls", () => {
  it("renders an accessible, enabled checkbox for a recipient", () => {
    const html = render();
    expect(checkbox(html)).toContain('aria-checked="false"');
    expect(checkbox(html)).not.toContain("disabled");
    expect(html).toContain("Streep A wanted film af");
  });
  it("shows a gift reserved by someone else as checked and locked", () => {
    const html = render({ is_reserved: true, can_release: false, reserved_by_you: false });
    expect(checkbox(html)).toContain('aria-checked="true"');
    expect(checkbox(html)).toContain("disabled");
    expect(html).toContain("Al gereserveerd / gekocht");
  });
  it("allows undoing a recipient's own mark", () => {
    const html = render({ is_reserved: true, can_release: true, reserved_by_you: true });
    expect(checkbox(html)).not.toContain("disabled");
    expect(html).toContain("Door jou gereserveerd / gekocht");
  });
  it("keeps older databases readable without displaying a checkbox that cannot save", () => {
    const html = render({}, false);
    expect(checkbox(html)).toBeUndefined();
    expect(html).toContain("Afstrepen is nog niet beschikbaar");
  });
});
