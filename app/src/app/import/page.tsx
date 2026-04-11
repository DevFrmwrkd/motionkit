"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SandboxedPresetPlayer } from "@/components/preset/SandboxedPresetPlayer";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PresetSchema, PresetMeta } from "@/lib/types";
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
  const { user } = useCurrentUser();

  if (!user) return null;

  return <ImportContent userId={user._id as Id<"users">} />;
}

function ImportContent({ userId }: { userId: Id<"users"> }) {
  const [componentCode, setComponentCode] = useState(TEMPLATE_CODE);
  const [schemaJson, setSchemaJson] = useState(TEMPLATE_SCHEMA);
  const [metaJson, setMetaJson] = useState(TEMPLATE_META);
  const [saving, setSaving] = useState(false);

  const createPreset = useMutation(api.presets.create);

  // Parse schema + meta JSON ONLY — never execute componentCode on the main
  // thread. The live preview sends componentCode to the sandboxed iframe.
  const parsed = useMemo((): {
    schema: PresetSchema | null;
    meta: PresetMeta | null;
    error: string | null;
  } => {
    if (!componentCode.trim() || !schemaJson.trim() || !metaJson.trim()) {
      return { schema: null, meta: null, error: "Fill in all three sections" };
    }
    let schema: PresetSchema;
    let meta: PresetMeta;
    try {
      schema = JSON.parse(schemaJson) as PresetSchema;
    } catch (e) {
      return {
        schema: null,
        meta: null,
        error: "Invalid schema JSON: " + (e instanceof Error ? e.message : ""),
      };
    }
    try {
      meta = JSON.parse(metaJson) as PresetMeta;
    } catch (e) {
      return {
        schema: null,
        meta: null,
        error: "Invalid meta JSON: " + (e instanceof Error ? e.message : ""),
      };
    }
    if (!meta.name || !meta.fps || !meta.width || !meta.height || !meta.durationInFrames) {
      return {
        schema,
        meta,
        error: "Meta must include name, fps, width, height, durationInFrames",
      };
    }
    return { schema, meta, error: null };
  }, [componentCode, schemaJson, metaJson]);

  const handleImport = async () => {
    if (parsed.error || !parsed.meta || !parsed.schema) {
      toast.error("Fix errors before importing");
      return;
    }

    setSaving(true);
    try {
      const { meta } = parsed;
      // authorId is derived server-side from the authenticated session.
      await createPreset({
        name: meta.name,
        description: meta.description,
        category: (meta.category ?? "full") as
          | "intro" | "title" | "lower-third" | "cta" | "transition"
          | "outro" | "full" | "chart" | "map" | "social",
        tags: meta.tags ?? [],
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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Code2 className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold">Import Preset</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Paste your Remotion component code, define the input schema, and preview it live.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Code inputs */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Component Code (TSX)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={componentCode}
                onChange={(e) => setComponentCode(e.target.value)}
                className="font-mono text-xs bg-muted border-zinc-700 min-h-[200px] resize-y"
                placeholder="Paste your Remotion component..."
              />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Input Schema (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={schemaJson}
                onChange={(e) => setSchemaJson(e.target.value)}
                className="font-mono text-xs bg-muted border-zinc-700 min-h-[100px] resize-y"
                placeholder='{ "title": { "type": "text", "default": "Hello" } }'
              />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Metadata (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={metaJson}
                onChange={(e) => setMetaJson(e.target.value)}
                className="font-mono text-xs bg-muted border-zinc-700 min-h-[100px] resize-y"
                placeholder='{ "name": "My Preset", "fps": 30, "width": 1920, "height": 1080, "durationInFrames": 90 }'
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview + status */}
        <div className="space-y-4">
          {/* Validation status */}
          <Card className={`border ${parsed.error ? "bg-red-500/5 border-red-500/20" : "bg-green-500/5 border-green-500/20"}`}>
            <CardContent className="p-3 flex items-center gap-2">
              {parsed.error ? (
                <>
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{parsed.error}</p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  <p className="text-sm text-green-400">Valid preset — ready to import</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Live preview — rendered in a sandboxed null-origin iframe so
              the imported code cannot read host state even if malicious. */}
          {!parsed.error && parsed.schema && parsed.meta && (
            <Card className="bg-card border-border overflow-hidden">
              <CardContent className="p-0">
                <SandboxedPresetPlayer
                  code={componentCode}
                  schemaJson={schemaJson}
                  metaJson={metaJson}
                  inputProps={Object.fromEntries(
                    Object.entries(parsed.schema).map(([k, v]) => [k, v.default])
                  )}
                  aspectRatio={parsed.meta.width / parsed.meta.height}
                />
              </CardContent>
            </Card>
          )}

          {/* Import button */}
          <Button
            onClick={handleImport}
            disabled={Boolean(parsed.error) || saving}
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
  );
}
