"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAction, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, KeyRound, Check, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Mirrors convex/aiGeneration.ts dispatch return. Defined inline (rather
// than shared via lib/) to keep this panel self-contained while the Create
// page's own copy lives on there. If a third caller shows up, hoist.
type DispatchResult =
  | {
      ok: true;
      componentCode: string;
      schema: string;
      meta: string;
      summary: string;
    }
  | {
      ok: false;
      error: string;
      errorType: "validation" | "edit_failed" | "api";
    };

/**
 * AI Remix panel — rides inside the workstation right rail.
 *
 * Sends the preset's current source code + the user's instruction to the
 * existing aiGeneration dispatch pipeline (same one the Create page uses),
 * then offers the returned component as an "Apply" action that patches the
 * preset's `sourceCode` + `inputSchema`.
 *
 * Gated behind BYOK: if the user hasn't stored an Anthropic or Gemini key,
 * we surface a settings CTA instead of silently hitting a platform key.
 */

type ChatTurn =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      summary: string;
      code: string;
      schema: string;
      meta: string;
      applied: boolean;
    }
  | { role: "error"; message: string; isByok: boolean };

interface AIRemixPanelProps {
  presetId: Id<"presets"> | null;
  sourceCode: string | null;
  isOwner: boolean;
  userId: Id<"users"> | null;
  hasAnthropicKey: boolean;
  hasGeminiKey: boolean;
  onApplied?: () => void;
}

export function AIRemixPanel({
  presetId,
  sourceCode,
  isOwner,
  userId,
  hasAnthropicKey,
  hasGeminiKey,
  onApplied,
}: AIRemixPanelProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const createGeneration = useMutation(api.aiGeneration.create);
  const dispatchGeneration = useAction(api.aiGeneration.dispatch);
  const updatePreset = useMutation(api.presets.update);

  // Auto-scroll to newest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length]);

  const preferredProvider: "claude" | "gemini" | null = hasAnthropicKey
    ? "claude"
    : hasGeminiKey
      ? "gemini"
      : null;

  // Empty-state + guards
  if (!presetId || !sourceCode) {
    return (
      <EmptyState
        icon={<Sparkles className="w-5 h-5 text-muted-foreground" />}
        title="No source to remix"
        body="Pick a preset with source code to chat your way to a new version."
      />
    );
  }

  if (!isOwner) {
    return (
      <EmptyState
        icon={<Sparkles className="w-5 h-5 text-muted-foreground" />}
        title="Remix a copy first"
        body="You don't own this preset. Hit Remix on it from the Marketplace to make an editable copy, then chat here."
      />
    );
  }

  if (!userId) {
    return (
      <EmptyState
        icon={<Sparkles className="w-5 h-5 text-muted-foreground" />}
        title="Sign in to remix"
        body="AI remix runs against your own provider keys — sign in to use it."
      />
    );
  }

  if (!preferredProvider) {
    return (
      <ByokGate />
    );
  }

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setTurns((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsSending(true);

    try {
      const genId = await createGeneration({
        userId,
        prompt: trimmed,
        provider: preferredProvider,
      });

      const result = (await dispatchGeneration({
        generationId: genId,
        prompt: trimmed,
        provider: preferredProvider,
        currentCode: sourceCode,
        // No conversation history on first pass — the preset's source is
        // the canonical starting point. Subsequent turns could thread via
        // parentGenerationId, but we keep it single-shot here for clarity.
      })) as DispatchResult;

      if (!result.ok) {
        const msg = result.error ?? "Generation failed";
        const isByok = /BYOK required/i.test(msg);
        setTurns((prev) => [...prev, { role: "error", message: msg, isByok }]);
      } else {
        setTurns((prev) => [
          ...prev,
          {
            role: "assistant",
            summary: result.summary ?? "Remix ready.",
            code: result.componentCode,
            schema: result.schema,
            meta: result.meta,
            applied: false,
          },
        ]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Remix failed";
      const isByok = /BYOK required/i.test(msg);
      setTurns((prev) => [...prev, { role: "error", message: msg, isByok }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleApply = async (turnIndex: number) => {
    const turn = turns[turnIndex];
    if (!turn || turn.role !== "assistant" || turn.applied) return;

    setApplyingIndex(turnIndex);
    try {
      await updatePreset({
        id: presetId,
        sourceCode: turn.code,
        inputSchema: turn.schema,
      });
      setTurns((prev) =>
        prev.map((t, i) =>
          i === turnIndex && t.role === "assistant" ? { ...t, applied: true } : t
        )
      );
      toast.success("Remix applied — preview updated");
      onApplied?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply remix");
    } finally {
      setApplyingIndex(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="px-3 py-3 space-y-3">
          {turns.length === 0 && (
            <div className="text-center py-8 px-2">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-foreground">Chat to remix</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px] mx-auto">
                Describe what to change — colors, animation timing, layout,
                extra elements. The AI gets the full source and schema.
              </p>
            </div>
          )}

          {turns.map((turn, idx) => {
            if (turn.role === "user") {
              return (
                <div key={idx} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-2 text-xs text-foreground whitespace-pre-wrap">
                    {turn.content}
                  </div>
                </div>
              );
            }
            if (turn.role === "error") {
              return (
                <div key={idx} className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{turn.message}</p>
                        {turn.isByok && (
                          <Link
                            href="/settings"
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300"
                          >
                            <KeyRound className="w-3 h-3" />
                            Add API key
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            const applying = applyingIndex === idx;
            return (
              <div key={idx} className="flex justify-start">
                <div className="max-w-[85%] rounded-lg bg-card border border-border px-3 py-2 text-xs text-foreground">
                  <p className="whitespace-pre-wrap">{turn.summary}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={turn.applied ? "outline" : "default"}
                      disabled={turn.applied || applying}
                      onClick={() => void handleApply(idx)}
                      className="h-7 text-[11px]"
                    >
                      {turn.applied ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Applied
                        </>
                      ) : applying ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        "Apply to preset"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-card border border-border px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border shrink-0 space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Make the accent color violet and slow down the entrance..."
          className="text-xs bg-card border-border resize-none min-h-[72px]"
          disabled={isSending}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            {preferredProvider === "claude" ? "Claude" : "Gemini"} · ⌘+Enter to send
          </span>
          <Button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isSending}
            size="sm"
            className="h-7"
          >
            <Send className="w-3 h-3 mr-1" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-[240px]">{body}</p>
    </div>
  );
}

function ByokGate() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-11 h-11 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
        <KeyRound className="w-5 h-5 text-amber-400" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">API key required</p>
      <p className="text-xs text-muted-foreground max-w-[260px] mb-4">
        MotionKit is free and doesn&apos;t subsidize model inference. Add your
        Anthropic or Google Gemini key to use AI Remix.
      </p>
      <Link
        href="/settings"
        className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Add API key
      </Link>
    </div>
  );
}
