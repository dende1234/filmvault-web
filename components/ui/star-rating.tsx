"use client";

import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

/** 0.5-step star rating, 0–5, matching the Android app's rating control. */
export function StarRating({
  value,
  onChange,
  disabled,
  max = 5,
}: {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  max?: number;
}) {
  const current = value ?? 0;

  function handleClick(starIndex: number, half: boolean) {
    if (disabled) return;
    const next = half ? starIndex + 0.5 : starIndex + 1;
    onChange(next);
  }

  return (
    <div className={cn("flex items-center gap-1", disabled && "opacity-60")}>
      {Array.from({ length: max }, (_, i) => {
        const filled = current >= i + 1;
        const halfFilled = !filled && current >= i + 0.5;
        return (
          <span key={i} className="relative inline-flex">
            <button
              type="button"
              aria-label={`${i + 0.5} sterren`}
              disabled={disabled}
              onClick={() => handleClick(i, true)}
              className="absolute left-0 h-6 w-3 overflow-hidden"
            />
            <button
              type="button"
              aria-label={`${i + 1} sterren`}
              disabled={disabled}
              onClick={() => handleClick(i, false)}
              className="h-6 w-6"
            >
              {filled ? (
                <Star className="h-6 w-6 fill-primary text-primary" />
              ) : halfFilled ? (
                <StarHalf className="h-6 w-6 fill-primary text-primary" />
              ) : (
                <Star className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
          </span>
        );
      })}
      {value != null && <span className="ml-1 text-sm text-muted-foreground">{value.toFixed(1)}</span>}
    </div>
  );
}
