import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Small pill for genres, formats (DVD / Blu-ray / 4K), "gezien", etc. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-elevated text-foreground ring-1 ring-inset ring-border",
        outline: "text-muted-foreground ring-1 ring-inset ring-border",
        success: "bg-success/15 text-success ring-1 ring-inset ring-success/30",
        warning: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/30",
        destructive: "bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/30",
        /** For use on top of posters/backdrops — readable on any image. */
        overlay: "bg-black/70 text-white backdrop-blur-sm",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
