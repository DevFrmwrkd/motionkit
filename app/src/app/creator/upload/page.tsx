"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  UploadCloud,
  Globe,
  Loader2,
  Sparkles,
  PencilLine,
  ArrowRight,
} from "lucide-react";
import { normalizePresetPricing } from "../../../../../shared/presetPricing";

const CATEGORIES = [
  { value: "intro", label: "Intro" },
  { value: "title", label: "Title" },
  { value: "lower-third", label: "Lower Third" },
  { value: "cta", label: "CTA" },
  { value: "transition", label: "Transition" },
  { value: "outro", label: "Outro" },
  { value: "full", label: "Full Composition" },
  { value: "chart", label: "Chart / Data" },
  { value: "map", label: "Map" },
  { value: "social", label: "Social Media" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

export default function CreatorUpload() {
  const searchParams = useSearchParams();
  const { user, isLoading } = useCurrentUser();
  const presets = useQuery(
    api.presets.listByUser,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );
  const updatePreset = useMutation(api.presets.update);

  const presetIdFromUrl = searchParams.get("id");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("title");
  const [tags, setTags] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState("0");
  const [publishToMarketplace, setPublishToMarketplace] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!presets || presets.length === 0) return;

    const nextPresetId =
      presetIdFromUrl && presets.some((preset) => preset._id === presetIdFromUrl)
        ? presetIdFromUrl
        : selectedPresetId ?? presets[0]._id;

    setSelectedPresetId(nextPresetId);
  }, [presetIdFromUrl, presets, selectedPresetId]);

  const selectedPreset = useMemo(
    () => presets?.find((preset) => preset._id === selectedPresetId) ?? null,
    [presets, selectedPresetId]
  );

  useEffect(() => {
    if (!selectedPreset) return;
    const monetization = normalizePresetPricing(selectedPreset);

    setName(selectedPreset.name);
    setDescription(selectedPreset.description ?? "");
    setCategory(selectedPreset.category as Category);
    setTags((selectedPreset.tags ?? []).join(", "));
    setThumbnailUrl(selectedPreset.thumbnailUrl ?? "");
    setIsPremium(monetization.isPremium);
    setPrice((monetization.priceCents / 100).toFixed(2));
    setPublishToMarketplace(
      selectedPreset.status === "published" && selectedPreset.isPublic
    );
  }, [selectedPreset]);

  const handleSave = async () => {
    if (!user || !selectedPreset) return;
    if (!name.trim()) {
      toast.error("Preset name is required");
      return;
    }

    const parsedPrice = Number(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Price must be a non-negative number");
      return;
    }
    if (isPremium && parsedPrice <= 0) {
      toast.error("Paid presets need a price greater than 0");
      return;
    }

    setSaving(true);
    try {
      // Server derives caller identity from the session — no userId arg.
      await updatePreset({
        id: selectedPreset._id as Id<"presets">,
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        license: isPremium ? "paid-personal" : "free",
        priceCents: isPremium ? Math.round(parsedPrice * 100) : 0,
        isPremium,
        price: isPremium ? parsedPrice : 0,
        isPublic: publishToMarketplace,
        status: publishToMarketplace ? "published" : "draft",
      });

      toast.success(
        publishToMarketplace
          ? "Preset published to marketplace"
          : "Preset saved as draft"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save preset");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || (user && presets === undefined)) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading publish tools...
      </div>
    );
  }

  if (!user) return null;

  if (!presets || presets.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Publish Preset</h1>
          <p className="mt-2 text-muted-foreground">
            Bundle upload is still planned. For now, publish presets you already created or imported.
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <UploadCloud className="size-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">No presets available yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Start in Create or Import, then come back here to add marketplace metadata and publish the listing.
            </p>
            <div className="flex gap-3">
              <Link href="/create">
                <Button className="bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400">
                  <Sparkles className="mr-2 size-4" />
                  Create with AI
                </Button>
              </Link>
              <Link href="/import">
                <Button variant="outline" className="border-border text-foreground hover:bg-accent">
                  Import preset
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Publish Preset</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Select one of your existing presets, refine its listing details, and control whether it stays private or appears in the marketplace.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Your Presets</CardTitle>
            <CardDescription className="text-muted-foreground">
              Choose a preset to edit its marketplace listing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {presets.map((preset) => (
              <button
                key={preset._id}
                type="button"
                onClick={() => setSelectedPresetId(preset._id)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  selectedPresetId === preset._id
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border bg-zinc-950/70 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{preset.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{preset.category}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      preset.status === "published"
                        ? "border-green-500/30 text-green-400"
                        : "border-zinc-700 text-muted-foreground"
                    }
                  >
                    {preset.status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{(preset.viewCount ?? 0).toLocaleString()} views</span>
                  <span>{(preset.downloads ?? 0).toLocaleString()} downloads</span>
                  <span>{preset.isPublic ? "Public" : "Private"}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-foreground">Listing Details</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Marketplace metadata for the selected preset.
                </CardDescription>
              </div>
              {selectedPreset && (
                <Link href={`/workstation?presetId=${selectedPreset._id}`}>
                  <Button variant="outline" className="border-border text-foreground hover:bg-accent">
                    <PencilLine className="mr-2 size-4" />
                    Open in workstation
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Preset Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-border bg-zinc-950 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
                  <SelectTrigger className="border-border bg-zinc-950 text-foreground">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] border-border bg-zinc-950 text-foreground"
                placeholder="Describe what makes this preset useful."
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Tags</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="border-border bg-zinc-950 text-foreground"
                  placeholder="intro, neon, tech"
                />
                <p className="text-xs text-muted-foreground">Comma-separated tags.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Thumbnail URL</Label>
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="border-border bg-zinc-950 text-foreground"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-zinc-950/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">Paid license</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Charge for downloads with a paid-personal license.
                    </p>
                  </div>
                  <Switch checked={isPremium} onCheckedChange={setIsPremium} />
                </div>
                <div className="mt-4 space-y-2">
                  <Label className="text-muted-foreground">Price (USD)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={!isPremium}
                    className="border-border bg-zinc-950 text-foreground disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-zinc-950/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">Publish to marketplace</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Published presets become public and discoverable.
                    </p>
                  </div>
                  <Switch
                    checked={publishToMarketplace}
                    onCheckedChange={setPublishToMarketplace}
                  />
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="size-3.5 text-amber-500" />
                  {publishToMarketplace
                    ? "This preset will be marked as published."
                    : "This preset will remain private draft content."}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-zinc-950/60 p-4 text-sm text-muted-foreground">
              <p>
                Bundle upload to Cloudflare R2 is still planned.
              </p>
              <p className="mt-2">
                Today, this screen focuses on the part creators actually need next: editing listing metadata and publishing presets you already generated or imported.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:justify-end">
              {selectedPreset && (
                <Link href={`/workstation?presetId=${selectedPreset._id}`}>
                  <Button variant="outline" className="border-border text-foreground hover:bg-accent">
                    Open in workstation
                  </Button>
                </Link>
              )}
              <Button
                onClick={handleSave}
                disabled={!selectedPreset || saving}
                className="bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400"
              >
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 size-4" />
                )}
                Save listing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
