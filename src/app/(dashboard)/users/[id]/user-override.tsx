"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, X, RotateCcw } from "lucide-react";
import { setUserOverride, clearUserOverride } from "@/lib/actions/assignments";

interface Resource {
  id: string;
  name: string;
}

interface Override {
  resourceType: string;
  resourceId: string;
}

interface Props {
  msUserId: string;
  isOverridden: boolean;
  currentOverrides: Override[];
  certifications: Resource[];
  banners: Resource[];
  legalTexts: Resource[];
}

const RESOURCE_LABELS: Record<string, string> = {
  certification: "Certification",
  banner: "Banner",
  legal_text: "Legal Text",
};

export function UserOverrideManager({
  msUserId,
  isOverridden,
  currentOverrides,
  certifications,
  banners,
  legalTexts,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [overrides, setOverrides] = useState<Override[]>(currentOverrides);
  const [addType, setAddType] = useState("certification");
  const [addId, setAddId] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const getResources = (type: string) => {
    if (type === "certification") return certifications;
    if (type === "banner") return banners;
    return legalTexts;
  };

  const getResourceName = (type: string, id: string) => {
    return getResources(type).find((r) => r.id === id)?.name ?? id;
  };

  const handleAdd = () => {
    if (!addId) return;
    const exists = overrides.some((o) => o.resourceType === addType && o.resourceId === addId);
    if (!exists) {
      setOverrides([...overrides, { resourceType: addType, resourceId: addId }]);
    }
    setAddId("");
  };

  const handleRemove = (idx: number) => {
    setOverrides(overrides.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    // Include currently selected resource if not yet added
    const finalOverrides = [...overrides];
    if (addId) {
      const exists = finalOverrides.some((o) => o.resourceType === addType && o.resourceId === addId);
      if (!exists) {
        finalOverrides.push({ resourceType: addType, resourceId: addId });
      }
    }
    
    startTransition(async () => {
      await setUserOverride({ msUserId, resources: finalOverrides });
      setEditing(false);
      setAddId("");
      router.refresh();
    });
  };

  const handleRestore = () => {
    if (!confirm("Remove all overrides and restore rule-based defaults?")) return;
    startTransition(async () => {
      await clearUserOverride(msUserId);
      setOverrides([]);
      setEditing(false);
      router.refresh();
    });
  };

  if (!editing) {
    return (
      <div className="space-y-3">
        {isOverridden ? (
          <>
            <p className="text-sm text-muted-foreground">
              This user has custom overrides. Rule-based assignments are bypassed.
            </p>
            <div className="space-y-1">
              {currentOverrides.map((o, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    {RESOURCE_LABELS[o.resourceType] ?? o.resourceType}
                  </span>
                  <span>{getResourceName(o.resourceType, o.resourceId)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No override set. Resources are assigned via rules.
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditing(true); setOverrides(currentOverrides); }}>
            {isOverridden ? "Edit Override" : "Set Override"}
          </Button>
          {isOverridden && (
            <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={handleRestore} disabled={isPending}>
              <RotateCcw className="h-3 w-3" />
              Restore Defaults
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pick the exact resources this user should have. This replaces ALL rule-based assignments.
      </p>

      {overrides.length > 0 && (
        <div className="space-y-1">
          {overrides.map((o, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  {RESOURCE_LABELS[o.resourceType] ?? o.resourceType}
                </span>
                <span className="font-medium">{getResourceName(o.resourceType, o.resourceId)}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemove(i)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Select value={addType} onValueChange={(v) => { setAddType(v); setAddId(""); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="certification">Certification</SelectItem>
            <SelectItem value="banner">Banner</SelectItem>
            <SelectItem value="legal_text">Legal Text</SelectItem>
          </SelectContent>
        </Select>
        <Select value={addId} onValueChange={setAddId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select resource..." />
          </SelectTrigger>
          <SelectContent position="popper">
            {getResources(addType).map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={!addId}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Override
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setEditing(false); setOverrides(currentOverrides); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
