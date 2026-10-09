"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Opens the trailer in a dialog. The YouTube iframe (privacy-enhanced
 * youtube-nocookie domain) only mounts after the click, so nothing loads
 * from YouTube before the viewer asks for it. */
export function TrailerButton({ youtubeKey, title }: { youtubeKey: string; title: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Play className="fill-current" />
        {t("movie_trailer_button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl overflow-hidden p-0">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {open && (
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeKey)}?autoplay=1&rel=0`}
                title={title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="size-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
