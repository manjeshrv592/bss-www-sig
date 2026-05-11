"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Globe, MapPin, Briefcase, Users } from "lucide-react";
import { createAssignment, deleteAssignment } from "@/lib/actions/assignments";

interface Assignment {
  id: string;
  scope: string;
  scopeValue: string | null;
  resourceType: string;
  resourceId: string;
  createdAt: Date;
}

interface Resource {
  id: string;
  name: string;
}

interface Group {
  id: string;
  displayName: string;
}

interface Props {
  assignments: Assignment[];
  certifications: Resource[];
  banners: Resource[];
  legalTexts: Resource[];
  countries: string[];
  jobTitles: string[];
  groups: Group[];
}

const SCOPE_ICONS: Record<string, typeof Globe> = {
  global: Globe,
  country: MapPin,
  job_title: Briefcase,
  group: Users,
};

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  country: "Country",
  job_title: "Job Title",
  group: "Group",
};

const RESOURCE_LABELS: Record<string, string> = {
  certification: "Certification",
  banner: "Banner",
  legal_text: "Legal Text",
};

export function AssignmentManager({
  assignments,
  certifications,
  banners,
  legalTexts,
  countries,
  jobTitles,
  groups,
}: Props) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState("global");
  const [scopeValue, setScopeValue] = useState("");
  const [resourceType, setResourceType] = useState("certification");
  const [resourceId, setResourceId] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const getResources = () => {
    if (resourceType === "certification") return certifications;
    if (resourceType === "banner") return banners;
    return legalTexts;
  };

  const getResourceName = (type: string, id: string) => {
    const list =
      type === "certification" ? certifications : type === "banner" ? banners : legalTexts;
    return list.find((r) => r.id === id)?.name ?? id;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId) return;
    startTransition(async () => {
      await createAssignment({
        scope,
        scopeValue: scope !== "global" ? scopeValue : undefined,
        resourceType,
        resourceId,
      });
      setOpen(false);
      setResourceId("");
      setScopeValue("");
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remove this assignment?")) return;
    startTransition(async () => {
      await deleteAssignment(id);
      router.refresh();
    });
  };

  // Group assignments by scope for display
  const grouped = assignments.reduce(
    (acc, a) => {
      const key = a.scopeValue ? `${a.scope}:${a.scopeValue}` : a.scope;
      if (!acc[key]) acc[key] = { scope: a.scope, scopeValue: a.scopeValue, items: [] };
      acc[key].items.push(a);
      return acc;
    },
    {} as Record<string, { scope: string; scopeValue: string | null; items: Assignment[] }>
  );

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v: boolean) => setOpen(v)}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Assignment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Scope</label>
                <Select value={scope} onValueChange={(v) => { setScope(v); setScopeValue(""); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="global">Global (all users)</SelectItem>
                    <SelectItem value="country">Country</SelectItem>
                    <SelectItem value="job_title">Job Title</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scope === "country" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Country</label>
                  <Select value={scopeValue} onValueChange={setScopeValue}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select country..." />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scope === "job_title" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Job Title</label>
                  <Select value={scopeValue} onValueChange={setScopeValue}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select job title..." />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {jobTitles.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scope === "group" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Group</label>
                  <Select value={scopeValue} onValueChange={setScopeValue}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select group..." />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Resource Type</label>
                <Select value={resourceType} onValueChange={(v) => { setResourceType(v); setResourceId(""); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="legal_text">Legal Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Resource</label>
                <Select value={resourceId} onValueChange={setResourceId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select resource..." />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {getResources().map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending || !resourceId}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Assign
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No assignments yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create rules to assign resources to user scopes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.values(grouped).map((group) => {
            const Icon = SCOPE_ICONS[group.scope] ?? Globe;
            const label = SCOPE_LABELS[group.scope] ?? group.scope;
            return (
              <Card key={`${group.scope}:${group.scopeValue ?? ""}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                    {group.scopeValue && (
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                        {group.scope === "group"
                          ? (groups.find((g) => g.id === group.scopeValue)?.displayName ?? group.scopeValue)
                          : group.scopeValue}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Type</th>
                        <th className="px-4 py-2 font-medium">Resource</th>
                        <th className="px-4 py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((a) => (
                        <tr
                          key={a.id}
                          className="border-b border-border/40 last:border-0 hover:bg-accent/50 transition-colors"
                        >
                          <td className="px-4 py-2">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                              {RESOURCE_LABELS[a.resourceType] ?? a.resourceType}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-medium">
                            {getResourceName(a.resourceType, a.resourceId)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(a.id)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
