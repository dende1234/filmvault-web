"use client";

import { useT } from "@/lib/i18n/locale-provider";
import { editionLabel } from "@/lib/edition-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** The type + editie dropdown pair used in the admin barcode screens and the import. */
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
  const { locale } = useT();
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
              {editionLabel(e, locale)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
