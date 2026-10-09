"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import {
  createEditie,
  createMediaType,
  deleteEditie,
  deleteMediaType,
  getEdities,
  getMediaTypes,
  renameEditie,
  renameMediaType,
} from "@/actions/media-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type PendingDelete = { name: string; isEditie: boolean };

export function AdminManageTypesClient() {
  const { t } = useT();
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [edities, setEdities] = useState<string[]>([]);
  const [newType, setNewType] = useState("");
  const [newEditie, setNewEditie] = useState("");
  const [processingNames, setProcessingNames] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => {
    Promise.all([getMediaTypes(), getEdities()]).then(([types, eds]) => {
      setMediaTypes(types);
      setEdities(eds);
    });
  }, []);

  function withProcessing(key: string, fn: () => Promise<void>) {
    setProcessingNames((prev) => new Set(prev).add(key));
    fn().finally(() => {
      setProcessingNames((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    });
  }

  async function handleAddType() {
    const name = newType.trim();
    if (!name) return;
    withProcessing(`type:${name}`, async () => {
      const result = await createMediaType(name);
      if (result.error) {
        toast.error(t("admin_manage_types_error_action"));
      } else {
        setMediaTypes((prev) => [...prev, name]);
        setNewType("");
      }
    });
  }

  async function handleRenameType(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    withProcessing(`type:${oldName}`, async () => {
      const result = await renameMediaType(oldName, trimmed);
      if (result.error) {
        toast.error(t("admin_manage_types_error_action"));
      } else {
        setMediaTypes((prev) => prev.map((n) => (n === oldName ? trimmed : n)));
      }
    });
  }

  async function handleDeleteType(name: string) {
    withProcessing(`type:${name}`, async () => {
      const result = await deleteMediaType(name);
      if (result.error === "in_use") {
        toast.error(t("admin_manage_types_error_in_use"));
      } else if (result.error) {
        toast.error(t("admin_manage_types_error_action"));
      } else {
        setMediaTypes((prev) => prev.filter((n) => n !== name));
      }
    });
  }

  async function handleAddEditie() {
    const name = newEditie.trim();
    if (!name) return;
    withProcessing(`editie:${name}`, async () => {
      const result = await createEditie(name);
      if (result.error) {
        toast.error(t("admin_manage_types_error_action"));
      } else {
        setEdities((prev) => [...prev, name]);
        setNewEditie("");
      }
    });
  }

  async function handleRenameEditie(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    withProcessing(`editie:${oldName}`, async () => {
      const result = await renameEditie(oldName, trimmed);
      if (result.error) {
        toast.error(t("admin_manage_types_error_action"));
      } else {
        setEdities((prev) => prev.map((n) => (n === oldName ? trimmed : n)));
      }
    });
  }

  async function handleDeleteEditie(name: string) {
    withProcessing(`editie:${name}`, async () => {
      const result = await deleteEditie(name);
      if (result.error === "in_use") {
        toast.error(t("admin_manage_types_error_in_use"));
      } else if (result.error) {
        toast.error(t("admin_manage_types_error_action"));
      } else {
        setEdities((prev) => prev.filter((n) => n !== name));
      }
    });
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.isEditie) await handleDeleteEditie(pendingDelete.name);
    else await handleDeleteType(pendingDelete.name);
    setPendingDelete(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("admin_manage_types_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin_manage_types_description")}</p>
      </div>

      <LookupSection
        title={t("admin_manage_types_types_section")}
        items={mediaTypes}
        keyPrefix="type"
        processingNames={processingNames}
        newValue={newType}
        onNewValueChange={setNewType}
        onAdd={handleAddType}
        onRename={handleRenameType}
        onDeleteRequest={(name) => setPendingDelete({ name, isEditie: false })}
        addPlaceholder={t("admin_manage_types_add_placeholder")}
        addLabel={t("action_add")}
      />

      <LookupSection
        title={t("admin_manage_types_edities_section")}
        items={edities}
        keyPrefix="editie"
        processingNames={processingNames}
        newValue={newEditie}
        onNewValueChange={setNewEditie}
        onAdd={handleAddEditie}
        onRename={handleRenameEditie}
        onDeleteRequest={(name) => setPendingDelete({ name, isEditie: true })}
        addPlaceholder={t("admin_manage_types_add_placeholder")}
        addLabel={t("action_add")}
      />

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin_manage_types_delete_title")}</DialogTitle>
            <DialogDescription>
              {pendingDelete && t("admin_manage_types_delete_confirm_text", pendingDelete.name)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              {t("action_cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t("action_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LookupSection({
  title,
  items,
  keyPrefix,
  processingNames,
  newValue,
  onNewValueChange,
  onAdd,
  onRename,
  onDeleteRequest,
  addPlaceholder,
  addLabel,
}: {
  title: string;
  items: string[];
  keyPrefix: string;
  processingNames: Set<string>;
  newValue: string;
  onNewValueChange: (value: string) => void;
  onAdd: () => void;
  onRename: (oldName: string, newName: string) => void;
  onDeleteRequest: (name: string) => void;
  addPlaceholder: string;
  addLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">{title}</h2>
      {items.map((name) => (
        <LookupRow
          key={name}
          name={name}
          isProcessing={processingNames.has(`${keyPrefix}:${name}`)}
          onRename={(newName) => onRename(name, newName)}
          onDeleteClick={() => onDeleteRequest(name)}
        />
      ))}
      <div className="flex gap-2">
        <Input placeholder={addPlaceholder} value={newValue} onChange={(e) => onNewValueChange(e.target.value)} />
        <Button onClick={onAdd}>{addLabel}</Button>
      </div>
    </div>
  );
}

function LookupRow({
  name,
  isProcessing,
  onRename,
  onDeleteClick,
}: {
  name: string;
  isProcessing: boolean;
  onRename: (newName: string) => void;
  onDeleteClick: () => void;
}) {
  const [value, setValue] = useState(name);

  return (
    <Card>
      <CardContent className="flex items-center gap-2 pt-5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value.trim() && value.trim() !== name) onRename(value);
            else setValue(name);
          }}
          disabled={isProcessing}
          className="flex-1"
        />
        <Button size="sm" variant="destructive" disabled={isProcessing} onClick={onDeleteClick}>
          <Trash2 className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
