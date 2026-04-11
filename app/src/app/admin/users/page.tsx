"use client";

/**
 * Admin user list with role editor. Uses `api.admin.setUserRole` for
 * promote/demote. Admins cannot demote themselves (enforced server-side).
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type RoleFilter = "all" | "user" | "creator" | "admin";

export default function AdminUsersPage() {
  const [filter, setFilter] = useState<RoleFilter>("all");
  const users = useQuery(
    api.admin.listUsers,
    filter === "all" ? {} : { role: filter }
  );
  const setRole = useMutation(api.admin.setUserRole);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeRole(
    userId: Id<"users">,
    role: "user" | "creator" | "admin"
  ) {
    setBusyId(userId);
    try {
      await setRole({ userId, role });
      toast.success(`Set role to ${role}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Role change failed");
    } finally {
      setBusyId(null);
    }
  }

  if (users === undefined) {
    return <div className="text-sm text-zinc-500">Loading users…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Users</h1>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            {users.length} user{users.length === 1 ? "" : "s"}
          </CardTitle>
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as RoleFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="creator">Creator</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <div
              key={u._id}
              className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/40 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-100">
                  {u.name ?? "(no name)"}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {u.email ?? "(no email)"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {u.role ?? "user"}
                </Badge>
                {u.role !== "admin" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changeRole(u._id, "admin")}
                    disabled={busyId === u._id}
                  >
                    Make admin
                  </Button>
                ) : null}
                {u.role !== "creator" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changeRole(u._id, "creator")}
                    disabled={busyId === u._id}
                  >
                    Make creator
                  </Button>
                ) : null}
                {u.role !== "user" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changeRole(u._id, "user")}
                    disabled={busyId === u._id}
                  >
                    Demote
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
