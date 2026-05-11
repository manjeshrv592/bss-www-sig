"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Loader2, Globe } from "lucide-react";
import {
  createCountryConfig,
  updateCountryConfig,
  deleteCountryConfig,
} from "@/lib/actions/country-config";

interface Config {
  id: string;
  country: string;
  companyName: string;
  website: string | null;
}

interface Props {
  configs: Config[];
  availableCountries: string[];
}

export function CountryConfigManager({ configs, availableCountries }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Config | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Create form state
  const [country, setCountry] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");

  // Edit form state
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editWebsite, setEditWebsite] = useState("");

  const resetCreate = () => {
    setCountry("");
    setCompanyName("");
    setWebsite("");
  };

  const openEdit = (item: Config) => {
    setEditItem(item);
    setEditCompanyName(item.companyName);
    setEditWebsite(item.website ?? "");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!country || !companyName) return;
    startTransition(async () => {
      await createCountryConfig({ country, companyName, website });
      setCreateOpen(false);
      resetCreate();
      router.refresh();
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !editCompanyName) return;
    startTransition(async () => {
      await updateCountryConfig(editItem.id, {
        companyName: editCompanyName,
        website: editWebsite,
      });
      setEditItem(null);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this country config?")) return;
    startTransition(async () => {
      await deleteCountryConfig(id);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={(v: boolean) => { setCreateOpen(v); if (!v) resetCreate(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Country
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Country Config</DialogTitle>
              <DialogDescription>
                Map a country to a specific company name and website for email signatures.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Country</label>
                {availableCountries.length > 0 ? (
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select country..." />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {availableCountries.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Enter country name..."
                    required
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Company Name</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Blackstone Shipping India Pvt Ltd"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Website</label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.example.com"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending || !country || !companyName}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(v: boolean) => { if (!v) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit: {editItem?.country}</DialogTitle>
            <DialogDescription>
              Update the company name and website for this country.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Company Name</label>
              <Input
                value={editCompanyName}
                onChange={(e) => setEditCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Website</label>
              <Input
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditItem(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending || !editCompanyName}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Update
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No country configs yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              All users will use the fallback: Blackstone Shipping Private Limited.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium">Company Name</th>
                  <th className="px-4 py-3 font-medium">Website</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr
                    key={config.id}
                    className="border-b border-border/40 last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{config.country}</td>
                    <td className="px-4 py-3 text-muted-foreground">{config.companyName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {config.website ? (
                        <a
                          href={config.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {config.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(config)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(config.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
