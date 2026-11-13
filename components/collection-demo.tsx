"use client";

import { useState } from "react";
import { Check, FileUp, ScanBarcode, Store } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { Poster } from "@/components/movie/poster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Illustrative data only: never reads or writes a member's collection.
const FILMS = [
  { title: "Interstellar", type: "4K UHD", edition: "Steelbook", poster: "/gEU2QniE6E77NI6lCU6MxlNBvIx2.jpg" },
  { title: "Inception", type: "Blu-ray", edition: "", poster: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
  { title: "The Matrix", type: "DVD", edition: "", poster: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg" },
  { title: "The Lord of the Rings: The Fellowship of the Ring", type: "4K UHD", edition: "Extended Edition", poster: "/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg" },
];

export function CollectionDemo() {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("all");
  const [scanned, setScanned] = useState(false);
  const [imported, setImported] = useState(false);
  const films = FILMS.filter((f) => f.title.toLowerCase().includes(query.toLowerCase()) && (format === "all" || f.type === format));

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h3 className="font-display text-xl font-semibold">{t("landing_demo_collection_name")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("demo_notice")}</p>
        </div>
        <Badge variant="outline">{t("landing_demo_example")}</Badge>
      </div>
      <Tabs defaultValue="collection" className="p-4 sm:p-6">
        <TabsList className="mb-5 flex h-auto flex-wrap justify-start">
          <TabsTrigger value="collection">{t("collections_label")}</TabsTrigger>
          <TabsTrigger value="shop"><Store className="mr-1 size-4" />{t("shop_nav")}</TabsTrigger>
          <TabsTrigger value="import"><FileUp className="mr-1 size-4" />{t("import_title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="collection" className="flex flex-col gap-5">
          <Input aria-label={t("demo_search")} placeholder={t("demo_search")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="flex flex-wrap gap-2" aria-label={t("demo_filter")}>
            {["all", "4K UHD", "Blu-ray", "DVD"].map((value) => (
              <Button key={value} size="sm" variant={format === value ? "default" : "outline"} aria-pressed={format === value} onClick={() => setFormat(value)}>
                {value === "all" ? t("demo_all") : value}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground" role="status">{t("collections_film_count", films.length)}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {films.map((film) => (
              <div key={film.title} className="flex flex-col items-start gap-2">
                <Poster path={film.poster} title={film.title} size="sm" className="w-full" />
                <p className="line-clamp-2 text-sm font-medium">{film.title}</p>
                <Badge variant="secondary">{film.type}</Badge>
                {film.edition && <p className="text-xs text-primary">{film.edition}</p>}
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="shop" className="flex min-h-64 flex-col items-start gap-4">
          <h4 className="font-display text-2xl font-semibold">{t("demo_shop_title")}</h4>
          <p className="max-w-xl text-sm text-muted-foreground">{t("demo_shop_hint")}</p>
          <Button onClick={() => setScanned(true)}><ScanBarcode />{t("demo_scan")}</Button>
          {scanned && <div role="status" className="w-full rounded-lg border border-success/40 bg-success/10 p-5">
            <p className="flex items-center gap-2 font-medium"><Check className="size-5 text-success" />{t("demo_owned")}</p>
            <p className="mt-2 text-sm">Interstellar · 4K UHD · Steelbook</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("demo_shop_result")}</p>
          </div>}
        </TabsContent>
        <TabsContent value="import" className="flex min-h-64 flex-col items-start gap-4">
          <h4 className="font-display text-2xl font-semibold">{t("onboarding_import")}</h4>
          <p className="max-w-xl text-sm text-muted-foreground">{t("demo_import_hint")}</p>
          <pre className="w-full overflow-x-auto rounded-lg bg-background p-4 text-xs">{"Titel,Formaat\nInterstellar,4K Ultra HD\nInception,Blu-ray\nThe Matrix,DVD"}</pre>
          <Button disabled={imported} onClick={() => setImported(true)}><FileUp />{t("demo_import")}</Button>
          {imported && <p role="status" className="text-sm text-success">{t("demo_import_result")}</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
