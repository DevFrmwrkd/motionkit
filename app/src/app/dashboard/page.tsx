"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Film,
  Folder,
  Download,
  Clock,
  Sparkles,
  LayoutGrid,
  Wrench,
  Loader2,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (!user) return null;

  return <DashboardContent userId={user._id as Id<"users">} userName={user.name ?? "Creator"} />;
}

function DashboardContent({ userId, userName }: { userId: Id<"users">; userName: string }) {
  const myPresets = useQuery(api.presets.listByUser, { userId });
  const savedPresets = useQuery(api.savedPresets.listByUser, { userId });
  const collections = useQuery(api.collections.listByUser, { userId });
  const renderJobs = useQuery(api.renderJobs.listByUser, { userId });
  const generations = useQuery(api.aiGeneration.listByUser, { userId });
  const allPresets = useQuery(api.presets.list, { viewerId: userId });

  const totalDownloads = useMemo(
    () => (myPresets ?? []).reduce((sum, p) => sum + (p.downloads ?? 0), 0),
    [myPresets]
  );
  const presetNameById = useMemo(
    () => new Map((allPresets ?? []).map((preset) => [preset._id, preset.name])),
    [allPresets]
  );

  const stats = [
    { label: "My Presets", value: myPresets?.length ?? 0, icon: Film },
    { label: "Saved Variants", value: savedPresets?.length ?? 0, icon: Folder },
    { label: "Total Downloads", value: totalDownloads, icon: Download },
    { label: "Collections", value: collections?.length ?? 0, icon: LayoutGrid },
    { label: "AI Generations", value: generations?.length ?? 0, icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            Welcome back, <span className="text-amber-500">{userName}</span>
          </h1>
          <p className="text-zinc-400 mt-1">Here&apos;s your creative overview.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/create">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/40 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium">Create with AI</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/marketplace">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/40 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <LayoutGrid className="w-5 h-5 text-violet-400" />
                <span className="text-sm font-medium">Browse Marketplace</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/workstation">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/40 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <Wrench className="w-5 h-5 text-teal-400" />
                <span className="text-sm font-medium">Open Workstation</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Presets */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">My Presets</CardTitle>
              <Link href="/create">
                <Button variant="ghost" size="sm" className="text-xs text-zinc-400">
                  <Plus className="w-3 h-3 mr-1" /> New
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {myPresets === undefined ? (
                <div className="py-4 text-center text-zinc-500 text-sm">Loading...</div>
              ) : myPresets.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm text-zinc-500">No presets yet</p>
                  <Link
                    href="/create"
                    className="text-sm text-amber-500 hover:text-amber-400"
                  >
                    Create your first preset
                  </Link>
                </div>
              ) : (
                myPresets.map((preset) => (
                  <Link
                    key={preset._id}
                    href={`/workstation?presetId=${preset._id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Film className="w-4 h-4 text-zinc-500" />
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{preset.name}</p>
                        <p className="text-xs text-zinc-500">{preset.category}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        preset.status === "published"
                          ? "text-green-400 border-green-500/30"
                          : "text-zinc-400 border-zinc-700"
                      }
                    >
                      {preset.status}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Saved Variants</CardTitle>
              <Link href="/workstation">
                <Button variant="ghost" size="sm" className="text-xs text-zinc-400">
                  Open Workstation
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedPresets === undefined ? (
                <div className="py-4 text-center text-zinc-500 text-sm">Loading...</div>
              ) : savedPresets.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm text-zinc-500">No saved variants yet</p>
                  <p className="text-xs text-zinc-600">
                    Save customized presets from the workstation to reuse them later.
                  </p>
                </div>
              ) : (
                savedPresets.slice(0, 5).map((item) => (
                  <Link
                    key={item._id}
                    href={`/workstation?savedPresetId=${item._id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Folder className="w-4 h-4 text-violet-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{item.name}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {presetNameById.get(item.presetId) ?? "Original preset"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                      Variant
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-6">

          {/* Recent Renders */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recent Renders</CardTitle>
              <Link href="/dashboard/history">
                <Button variant="ghost" size="sm" className="text-xs text-zinc-400">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {renderJobs === undefined ? (
                <div className="py-4 text-center text-zinc-500 text-sm">Loading...</div>
              ) : renderJobs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-zinc-500">No render jobs yet</p>
                </div>
              ) : (
                renderJobs.slice(0, 5).map((job) => (
                  <div
                    key={job._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-zinc-500" />
                      <div>
                        <p className="text-sm font-medium text-zinc-200 truncate max-w-[200px]">
                          {presetNameById.get(job.presetId) ?? job.bundleUrl}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {job.startedAt
                            ? new Date(job.startedAt).toLocaleDateString()
                            : "Queued"}
                        </p>
                      </div>
                    </div>
                    <RenderStatusBadge status={job.status} progress={job.progress} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RenderStatusBadge({
  status,
  progress,
}: {
  status: string;
  progress?: number;
}) {
  const styles: Record<string, string> = {
    queued: "text-yellow-400 border-yellow-500/30",
    rendering: "text-blue-400 border-blue-500/30",
    done: "text-green-400 border-green-500/30",
    failed: "text-red-400 border-red-500/30",
  };

  return (
    <Badge variant="outline" className={styles[status] ?? "text-zinc-400 border-zinc-700"}>
      {status === "rendering" && progress ? `${progress}%` : status}
    </Badge>
  );
}
