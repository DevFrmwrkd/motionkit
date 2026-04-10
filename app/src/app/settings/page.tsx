"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, Key, User, CreditCard } from "lucide-react";

export default function SettingsPage() {
  const { user } = useCurrentUser();

  if (!user) return null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <Tabs defaultValue="profile">
          <TabsList className="bg-card border border-border mb-6">
            <TabsTrigger value="profile" className="text-sm">
              <User className="w-4 h-4 mr-1.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="apikeys" className="text-sm">
              <Key className="w-4 h-4 mr-1.5" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="billing" className="text-sm">
              <CreditCard className="w-4 h-4 mr-1.5" />
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab
              userId={user._id as Id<"users">}
              name={user.name ?? ""}
              email={user.email ?? ""}
              bio={user.bio ?? ""}
              website={user.website ?? ""}
            />
          </TabsContent>

          <TabsContent value="apikeys">
            <ApiKeysTab
              userId={user._id as Id<"users">}
              modalApiKey={user.modalApiKey ?? ""}
              geminiApiKey={user.geminiApiKey ?? ""}
              anthropicApiKey={user.anthropicApiKey ?? ""}
            />
          </TabsContent>

          <TabsContent value="billing">
            <BillingTab plan={user.plan ?? "free"} credits={user.renderCredits ?? 0} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProfileTab({
  userId,
  name: initialName,
  email,
  bio: initialBio,
  website: initialWebsite,
}: {
  userId: Id<"users">;
  name: string;
  email: string;
  bio: string;
  website: string;
}) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [website, setWebsite] = useState(initialWebsite);
  const [saving, setSaving] = useState(false);
  const updateProfile = useMutation(api.users.updateProfile);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ userId, name, bio, website });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base">Profile Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Display Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-muted border-zinc-700"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Email</Label>
          <Input value={email} disabled className="bg-accent border-zinc-700 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Managed by Google sign-in</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Bio</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others about yourself..."
            className="bg-muted border-zinc-700 min-h-[80px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Website</Label>
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
            className="bg-muted border-zinc-700"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}

function ApiKeysTab({
  userId,
  modalApiKey: initialModal,
  geminiApiKey: initialGemini,
  anthropicApiKey: initialAnthropic,
}: {
  userId: Id<"users">;
  modalApiKey: string;
  geminiApiKey: string;
  anthropicApiKey: string;
}) {
  const [modalApiKey, setModalApiKey] = useState(initialModal);
  const [geminiApiKey, setGeminiApiKey] = useState(initialGemini);
  const [anthropicApiKey, setAnthropicApiKey] = useState(initialAnthropic);
  const [saving, setSaving] = useState(false);
  const updateApiKeys = useMutation(api.users.updateApiKeys);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateApiKeys({ userId, modalApiKey, geminiApiKey, anthropicApiKey });
      toast.success("API keys updated");
    } catch {
      toast.error("Failed to update API keys");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Generation Keys */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">AI Generation Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add your own API keys to generate motion graphics with AI. Without keys, you&apos;ll use the free demo quota.
          </p>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Google Gemini API Key</Label>
            <Input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="bg-muted border-zinc-700"
            />
            <p className="text-xs text-muted-foreground">
              Free tier: 15 requests/minute. Get yours at{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">
                aistudio.google.com
              </a>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Anthropic (Claude) API Key</Label>
            <Input
              type="password"
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="bg-muted border-zinc-700"
            />
            <p className="text-xs text-muted-foreground">
              Paid per token. Better code quality. Get yours at{" "}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">
                console.anthropic.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rendering Keys */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Render Keys (BYOK)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bring your own keys for cloud rendering.
          </p>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Modal API Key</Label>
            <Input
              type="password"
              value={modalApiKey}
              onChange={(e) => setModalApiKey(e.target.value)}
              placeholder="mk-..."
              className="bg-muted border-zinc-700"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
      >
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save All Keys
      </Button>
    </div>
  );
}

function BillingTab({ plan, credits }: { plan: string; credits: number }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base">Billing & Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Current Plan:</span>
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">
            {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Render Credits:</span>
          <span className="text-sm font-semibold text-foreground">{credits}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Upgrade options coming soon. AI generations use Google Gemini&apos;s free tier by default.
        </p>
      </CardContent>
    </Card>
  );
}
