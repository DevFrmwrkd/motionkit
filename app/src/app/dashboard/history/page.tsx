"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Download } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return <HistoryContent userId={user._id as Id<"users">} />;
}

function HistoryContent({ userId }: { userId: Id<"users"> }) {
  const jobs = useQuery(api.renderJobs.listByUser, { userId });

  const statusStyles: Record<string, string> = {
    queued: "text-yellow-400 border-yellow-500/30",
    rendering: "text-blue-400 border-blue-500/30",
    done: "text-green-400 border-green-500/30",
    failed: "text-red-400 border-red-500/30",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Render History</h1>

        {jobs === undefined ? (
          <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-500" /></div>
        ) : jobs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-zinc-500">No render jobs yet</p>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Preset</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Engine</TableHead>
                  <TableHead className="text-zinc-400">Date</TableHead>
                  <TableHead className="text-zinc-400 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job._id} className="border-zinc-800">
                    <TableCell className="font-medium text-zinc-200 max-w-[200px] truncate">
                      {job.bundleUrl.replace("local://presets/", "").replace("ai://generated/", "AI: ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyles[job.status] ?? ""}>
                        {job.status === "rendering" && job.progress
                          ? `${job.progress}%`
                          : job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">{job.renderEngine}</TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {job.startedAt ? new Date(job.startedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {job.status === "done" && job.outputUrl && (
                        <a
                          href={job.outputUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-amber-500 hover:text-amber-400"
                        >
                          <Download className="w-3 h-3" /> Download
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
