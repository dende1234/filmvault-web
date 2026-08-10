"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/** Filter/search text field with a clear ("x") button that appears once there's text — a
 * dedicated component next to the generic Input (used by dozens of non-filter form fields)
 * rather than adding a clear button to Input itself. Mirrors core/ClearableSearchField.kt on
 * Android; see that file for the full list of call sites this replaced. */
export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const { t } = useT();
    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(value && "pr-9", className)}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={() => onValueChange("")}
            aria-label={t("action_clear")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";

export { SearchInput };
