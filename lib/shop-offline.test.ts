import { describe, expect, it } from "vitest";
import { lookupOffline, type ShopSnapshot } from "@/lib/shop-offline";

const snap: ShopSnapshot = {
  userId: "u",
  savedAt: "2026-10-30",
  owned: { "111": { ids: [1], name: "Alien", poster: null, isBox: false } },
  known: { "111": [1], "222": [1], "333": [2], "444": [3], "555": [4, 5] },
  ownedIds: [1],
  wish: { "2": false, "3": true },
  titles: { "1": { name: "Alien", poster: null }, "2": { name: "Brazil", poster: null }, "3": { name: "Casablanca", poster: "/c.jpg" } },
};

describe("lookupOffline", () => {
  it("knows your own copy, another edition and the wishlist", () => {
    expect(lookupOffline(snap, "111")).toMatchObject({ status: "owned", name: "Alien" });
    expect(lookupOffline(snap, "222")).toMatchObject({ status: "other", ids: [1] });
    expect(lookupOffline(snap, "333")).toMatchObject({ status: "wish", name: "Brazil" });
    expect(lookupOffline(snap, "444")).toMatchObject({ status: "grail", poster: "/c.jpg" });
  });

  it("can't tell new from unknown without a connection", () => {
    expect(lookupOffline(snap, "555").status).toBe("unknown");
    expect(lookupOffline(snap, "999").status).toBe("unknown");
  });
});
