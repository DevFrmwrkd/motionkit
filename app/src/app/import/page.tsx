"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { PresetPlayer } from "@/components/preset/PresetPlayer";
import { codeToComponent } from "@/lib/code-to-component";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, AlertCircle, CheckCircle, Loader2, Code2 } from "lucide-react";

const TEMPLATE_CODE = `// Your Remotion component
const Component = ({ title = "Hello World", color = "#ffffff" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ color, fontSize: 80, fontWeight: 700, opacity }}>{title}</h1>
    </AbsoluteFill>
  );
};`;

const TEMPLATE_SCHEMA = `{
  "title": { "type": "text", "label": "Title", "default": "Hello World" },
  "color": { "type": "color", "label": "Text Color", "default": "#ffffff" }
}`;

const TEMPLATE_META = `{
  "name": "My Custom Preset",
  "description": "A custom imported preset",
  "category": "title",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "durationInFrames": 90
}`;

export default function ImportPage() {
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

  return <ImportContent userId={user._id as Id<"users">} />;
}

function ImportContent({ userId }: { userId: Id<"users"> }) {
  const [componentCode, setComponentCode] = useState(TEMPLATE_CODE);
  const [schemaJson, setSchemaJson] = useState(TEMPLATE_SCHEMA);
  const [metaJson, setMetaJson] = useState(TEMPLATE_META);
  const [saving, setSaving] = useState(false);

  const createPreset = useMutation(api.presets.create);

  const compiled = useMemo(() => {
    if (!componentCode.trim() || !schemaJson.trim() || !metaJson.trim()) {
      return { preset: null, error: "Fill in all three sections" };
    }
    return codeToComponent(componentCode, schemaJson, metaJson);
  }, [componentCode, schemaJson, metaJson]);

  const handleImport = async () => {
    if (!compiled.preset) {
      toast.error("Fix errors before importing");
      return;
    }

    setSaving(true);
    try {
      const { meta } = compiled.preset;
      await createPreset({
        name: meta.name,
        description: meta.description,
        category: (meta.category ?? "full") as
          | "intro" | "title" | "lower-third" | "cta" | "transition"
          | "outro" | "full" | "chart" | "map" | "social",
        tags: meta.tags ?? [],
        authorId: userId,
        bundleUrl: `import://user/${userId}/${Date.now()}`,
        fps: meta.fps,
        width: meta.width,
        height: meta.height,
        durationInFrames: meta.durationInFrames,
        inputSchema: schemaJson,
        sourceCode: componentCode,
        isPublic: false,
        status: "draft",
      });
      toast.success("Preset imported to your library!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Code2 className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold">Import Preset</h1>
          </div>
          <p className="text-zinc-400 text-sm">
            Paste your Remotion component code, define the input schema, and preview it live.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Code inputs */}
          <div className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Component Code (TSX)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={componentCode}
                  onChange={(e) => setComponentCode(e.target.value)}
                  className="font-mono text-xs bg-zinc-800 border-zinc-700 min-h-[200px] resize-y"
                  placeholder="Paste your Remotion component..."
                />
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Input Schema (JSON)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={schemaJson}
                  onChange={(e) => setSchemaJson(e.target.value)}
                  className="font-mono text-xs bg-zinc-800 border-zinc-700 min-h-[100px] resize-y"
                  placeholder='{ "title": { "type": "text", "default": "Hello" } }'
                />
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Metadata (JSON)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={metaJson}
                  onChange={(e) => setMetaJson(e.target.value)}
                  className="font-mono text-xs bg-zinc-800 border-zinc-700 min-h-[100px] resize-y"
                  placeholder='{ "name": "My Preset", "fps": 30, "width": 1920, "height": 1080, "durationInFrames": 90 }'
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: Preview + status */}
          <div className="space-y-4">
            {/* Validation status */}
            <Card className={`border ${compiled.error ? "bg-red-500/5 border-red-500/20" : "bg-green-500/5 border-green-500/20"}`}>
              <CardContent className="p-3 flex items-center gap-2">
                {compiled.error ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-sm text-red-400">{compiled.error}</p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <p className="text-sm text-green-400">Valid preset — ready to import</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Live preview */}
            {compiled.preset && (
              <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <CardContent className="p-0">
                  <PresetPlayer
                    component={compiled.preset.component}
                    inputProps={Object.fromEntries(
                      Object.entries(compiled.preset.schema).map(([k, v]) => [k, v.default])
                    )}
                    meta={compiled.preset.meta}
                  />
                </CardContent>
              </Card>
            )}

            {/* Import button */}
            <Button
              onClick={handleImport}
              disabled={!compiled.preset || saving}
              className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold h-11"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import to Library
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
