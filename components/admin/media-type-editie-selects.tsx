"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** The type + editie dropdown pair used throughout the admin barcode screens. */
export function MediaTypeEditieSelects({
  mediaTypes,
  edities,
  type,
  editie,
  onTypeChange,
  onEditieChange,
}: {
  mediaTypes: string[];
  edities: string[];
  type: string;
  editie: string;
  onTypeChange: (value: string) => void;
  onEditieChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Select value={type} onValueChange={onTypeChange}>
        <SelectTrigger className="flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {mediaTypes.map((mt) => (
            <SelectItem key={mt} value={mt}>
              {mt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={editie} onValueChange={onEditieChange}>
        <SelectTrigger className="flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {edities.map((e) => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
