"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { GitFork, ChevronRight } from "lucide-react";
import Link from "next/link";

interface VersionTreeProps {
  presetId: Id<"presets">;
}

export function VersionTree({ presetId }: VersionTreeProps) {
  const tree = useQuery(api.presets.getVersionTree, { presetId });

  if (!tree) return null;
  if (tree.versions.length === 0 && !tree.root.parentPresetId) {
    return (
      <div className="text-xs text-zinc-500 py-2">
        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
          Original
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Root */}
      <VersionNode
        name={tree.root.name}
        id={tree.root._id}
        isActive={tree.root._id === presetId}
        isRoot
        cloneCount={tree.root.cloneCount ?? 0}
      />

      {/* Forks */}
      {tree.versions.map((v) => (
        <div key={v._id} className="ml-4 border-l border-zinc-800 pl-3">
          <VersionNode
            name={v.name}
            id={v._id}
            isActive={v._id === presetId}
            isRoot={false}
            cloneCount={v.cloneCount ?? 0}
            author={v.author}
          />
        </div>
      ))}
    </div>
  );
}

function VersionNode({
  name,
  id,
  isActive,
  isRoot,
  cloneCount,
  author,
}: {
  name: string;
  id: string;
  isActive: boolean;
  isRoot: boolean;
  cloneCount: number;
  author?: string;
}) {
  return (
    <Link
      href={`/workstation?presetId=${id}`}
      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
        isActive
          ? "bg-amber-500/10 text-amber-400"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
      }`}
    >
      <GitFork className="w-3 h-3 shrink-0" />
      <span className="truncate flex-1">{name}</span>
      {isRoot && (
        <Badge variant="outline" className="text-[9px] px-1 py-0 border-zinc-700">
          Original
        </Badge>
      )}
      {cloneCount > 0 && (
        <span className="text-[10px] text-zinc-600">{cloneCount} forks</span>
      )}
      <ChevronRight className="w-3 h-3 opacity-50" />
    </Link>
  );
}

export function VersionBadge({ preset }: { preset: { parentPresetId?: string; rootPresetId?: string } }) {
  if (!preset.parentPresetId) {
    return (
      <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
        Original
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
      <GitFork className="w-2.5 h-2.5 mr-0.5" />
      Fork
    </Badge>
  );
}
