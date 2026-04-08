"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Key, Shield } from "lucide-react";

/**
 * Settings page: BYOK key management, profile.
 * Phase 3+: Full implementation with encrypted key storage.
 */
export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold text-zinc-100 mb-2">Settings</h1>
      <p className="text-zinc-400 mb-8">
        Manage your API keys and preferences.
      </p>

      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-zinc-200">
            Render API Keys (BYOK)
          </h2>
        </div>
        <p className="text-sm text-zinc-400 mb-6">
          Bring your own keys for rendering. Your keys are encrypted at rest.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="modal-key">Modal API Key</Label>
            <Input
              id="modal-key"
              type="password"
              placeholder="ak-..."
              className="bg-zinc-950 border-zinc-700"
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="aws-key">AWS Access Key ID (optional)</Label>
            <Input
              id="aws-key"
              type="password"
              placeholder="AKIA..."
              className="bg-zinc-950 border-zinc-700"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aws-secret">AWS Secret Access Key</Label>
            <Input
              id="aws-secret"
              type="password"
              placeholder="..."
              className="bg-zinc-950 border-zinc-700"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="text-xs text-zinc-500">
            Keys are encrypted with AES-256-GCM before storage
          </span>
        </div>

        <Button className="mt-6 bg-amber-500 hover:bg-amber-600 text-zinc-950">
          Save Keys
        </Button>
      </Card>
    </div>
  );
}
