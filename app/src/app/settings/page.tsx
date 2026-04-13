"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { normalizeOptionalString } from "../../../../shared/aiProviderConfig";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, Key, User, CreditCard, Sparkles, ExternalLink, Info } from "lucide-react";

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
              hasModalKey={Boolean(user.hasModalApiKey)}
              hasGeminiKey={Boolean(user.hasGeminiApiKey)}
              hasAnthropicKey={Boolean(user.hasAnthropicApiKey)}
              hasOpenRouterKey={Boolean(user.hasOpenRouterApiKey)}
              modalHint={user.modalApiKeyHint ?? null}
              geminiHint={user.geminiApiKeyHint ?? null}
              anthropicHint={user.anthropicApiKeyHint ?? null}
              openRouterHint={user.openRouterApiKeyHint ?? null}
              openRouterModel={user.openRouterModel ?? ""}
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
  hasModalKey,
  hasGeminiKey,
  hasAnthropicKey,
  hasOpenRouterKey,
  modalHint,
  geminiHint,
  anthropicHint,
  openRouterHint,
  openRouterModel: initialOpenRouterModel,
}: {
  userId: Id<"users">;
  hasModalKey: boolean;
  hasGeminiKey: boolean;
  hasAnthropicKey: boolean;
  hasOpenRouterKey: boolean;
  modalHint: string | null;
  geminiHint: string | null;
  anthropicHint: string | null;
  openRouterHint: string | null;
  openRouterModel: string;
}) {
  // Fields start empty and the server NEVER sends the real key values here.
  // Leaving a field blank = "keep whatever is stored". Typing = "replace it".
  // Clicking Remove = send empty string = clear that key server-side.
  const [modalApiKey, setModalApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  // Model id is NOT a secret — we ARE allowed to round-trip it from the
  // server and let the user edit it in place.
  const [openRouterModel, setOpenRouterModel] = useState(
    () => normalizeOptionalString(initialOpenRouterModel) ?? ""
  );
  const [savedOpenRouterModel, setSavedOpenRouterModel] = useState(
    () => normalizeOptionalString(initialOpenRouterModel) ?? ""
  );
  const [saving, setSaving] = useState(false);
  const updateApiKeys = useMutation(api.users.updateApiKeys);

  useEffect(() => {
    const normalizedModel = normalizeOptionalString(initialOpenRouterModel) ?? "";
    setOpenRouterModel(normalizedModel);
    setSavedOpenRouterModel(normalizedModel);
  }, [initialOpenRouterModel]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalizedOpenRouterModel =
        normalizeOptionalString(openRouterModel) ?? "";

      // Only send fields the user actually typed into. Empty string means
      // "don't touch" on the save path.
      await updateApiKeys({
        userId,
        ...(modalApiKey ? { modalApiKey } : {}),
        ...(geminiApiKey ? { geminiApiKey } : {}),
        ...(anthropicApiKey ? { anthropicApiKey } : {}),
        ...(openRouterApiKey ? { openRouterApiKey } : {}),
        // Model id: send whenever it changed (including "" to clear it).
        ...(normalizedOpenRouterModel !== savedOpenRouterModel
          ? { openRouterModel: normalizedOpenRouterModel }
          : {}),
      });
      setModalApiKey("");
      setGeminiApiKey("");
      setAnthropicApiKey("");
      setOpenRouterApiKey("");
      setOpenRouterModel(normalizedOpenRouterModel);
      setSavedOpenRouterModel(normalizedOpenRouterModel);
      toast.success("API keys updated");
    } catch {
      toast.error("Failed to update API keys");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (
    field:
      | "modalApiKey"
      | "geminiApiKey"
      | "anthropicApiKey"
      | "openRouterApiKey"
  ) => {
    try {
      await updateApiKeys({ userId, [field]: "" });
      toast.success("Key removed");
    } catch {
      toast.error("Failed to remove key");
    }
  };

  return (
    <div className="space-y-6">
      {/* BYOK How-To Guide */}
      <Card className="bg-card border-border border-amber-500/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Default: Gemini 3.0 (Free)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            By default, MotionKit uses <span className="text-amber-400 font-medium">Gemini 3.0</span> to
            generate your motion graphics. The free tier gives you roughly{" "}
            <span className="text-foreground font-medium">20 requests per day</span> — that&apos;s about
            20 charts/day free of charge.
          </p>
          <p className="text-sm text-muted-foreground">
            Need more iterations? Add your own Google AI Studio key below and use your personal quota.
            If you need even more, you can upgrade to a paid Google AI Studio account for higher limits.
          </p>
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">How to get your key</p>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>
                Open{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 hover:text-amber-400 inline-flex items-center gap-1"
                >
                  aistudio.google.com/apikey
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Click <span className="text-foreground">Create API key</span> and copy the <code className="text-amber-400">AIzaSy...</code> string</li>
              <li>Paste it into the Gemini field below and hit Save</li>
              <li>
                Check your usage anytime at{" "}
                <a
                  href="https://aistudio.google.com/usage?timeRange=last-28-days&project=gen-lang-client-0333927695"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 hover:text-amber-400 inline-flex items-center gap-1"
                >
                  aistudio.google.com/usage
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* AI Generation Keys */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">AI Generation Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add your own API keys to generate motion graphics with your personal quota. Without keys, you&apos;ll use the shared Gemini 3.0 free tier.
          </p>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground flex items-center justify-between">
              <span>Google Gemini API Key</span>
              {hasGeminiKey && (
                <span className="text-[10px] text-emerald-400">
                  Saved · {geminiHint ?? "••••"}
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder={hasGeminiKey ? "Enter new key to replace" : "AIzaSy..."}
                className="bg-muted border-zinc-700 flex-1"
                autoComplete="off"
              />
              {hasGeminiKey && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemove("geminiApiKey")}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Free: ~20 requests/day. Get yours at{" "}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">
                  aistudio.google.com/apikey
                </a>
                . The key is encrypted at rest and never shown again after saving.
              </span>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground flex items-center justify-between">
              <span>Anthropic (Claude) API Key</span>
              {hasAnthropicKey && (
                <span className="text-[10px] text-emerald-400">
                  Saved · {anthropicHint ?? "••••"}
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                placeholder={hasAnthropicKey ? "Enter new key to replace" : "sk-ant-..."}
                className="bg-muted border-zinc-700 flex-1"
                autoComplete="off"
              />
              {hasAnthropicKey && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemove("anthropicApiKey")}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Paid per token. Get yours at{" "}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">
                console.anthropic.com
              </a>
            </p>
          </div>

          {/* OpenRouter — user-supplied key + freeform model id */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <Label className="text-sm text-muted-foreground flex items-center justify-between pt-3">
              <span>OpenRouter API Key</span>
              {hasOpenRouterKey && (
                <span className="text-[10px] text-emerald-400">
                  Saved · {openRouterHint ?? "••••"}
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={openRouterApiKey}
                onChange={(e) => setOpenRouterApiKey(e.target.value)}
                placeholder={
                  hasOpenRouterKey
                    ? "Enter new key to replace"
                    : "sk-or-v1-..."
                }
                className="bg-muted border-zinc-700 flex-1"
                autoComplete="off"
              />
              {hasOpenRouterKey && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemove("openRouterApiKey")}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </Button>
              )}
            </div>
            <Label className="text-sm text-muted-foreground pt-2 block">
              Default model
            </Label>
            <Input
              type="text"
              value={openRouterModel}
              onChange={(e) => setOpenRouterModel(e.target.value)}
              placeholder="z-ai/glm-5.1"
              className="bg-muted border-zinc-700 font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                OpenRouter proxies hundreds of models behind one key. Paste
                any model id from{" "}
                <a
                  href="https://openrouter.ai/models"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 hover:text-amber-400"
                >
                  openrouter.ai/models
                </a>{" "}
                — e.g. <code className="text-amber-400">z-ai/glm-5.1</code>,{" "}
                <code className="text-amber-400">
                  deepseek/deepseek-chat-v3:free
                </code>
                . Get your key at{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 hover:text-amber-400"
                >
                  openrouter.ai/keys
                </a>
                .
              </span>
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
            <Label className="text-sm text-muted-foreground flex items-center justify-between">
              <span>Modal API Key</span>
              {hasModalKey && (
                <span className="text-[10px] text-emerald-400">
                  Saved · {modalHint ?? "••••"}
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={modalApiKey}
                onChange={(e) => setModalApiKey(e.target.value)}
                placeholder={hasModalKey ? "Enter new key to replace" : "mk-..."}
                className="bg-muted border-zinc-700 flex-1"
                autoComplete="off"
              />
              {hasModalKey && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemove("modalApiKey")}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </Button>
              )}
            </div>
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
          Upgrade options coming soon. AI generations use Google Gemini 3.0 on the free tier by default
          (~20 requests/day). Add your own key in the API Keys tab for more.
        </p>
      </CardContent>
    </Card>
  );
}
