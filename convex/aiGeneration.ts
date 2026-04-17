import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildSystemPrompt } from "./lib/ai_skills";
import { generateWithClaude } from "./lib/ai_providers/claude";
import { generateWithGemini, callGeminiWithFallback } from "./lib/ai_providers/gemini";
import { generateWithOpenRouter } from "./lib/ai_providers/openrouter";
import { categoryValidator } from "./lib/validators";
import {
  resolveOpenRouterModel,
  type AiProvider,
} from "../shared/aiProviderConfig";
import {
  requireAuthorizedUser,
  requireAuthUserIdFromAction,
  requireSignedInUser,
} from "./lib/authz";

type Provider = AiProvider;

type EditOperation = {
  description: string;
  old_string: string;
  new_string: string;
  lineNumber?: number;
};

type ConversationContextMessage = {
  role: "user" | "assistant";
  content: string;
  attachedImages?: string[];
  contentParts?: ConversationContentPart[];
};

type ConversationContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      imageUrl?: string;
      storageId?: string;
      alt?: string;
    };

type ImageData = {
  mimeType: string;
  data: string;
};

type ErrorCorrectionContext = {
  error: string;
  attemptNumber: number;
  maxAttempts: number;
  failedEdit?: EditOperation;
};

type FollowUpResponse = {
  type: "edit" | "full";
  summary: string;
  edits?: EditOperation[];
  code?: string;
  schema?: string | Record<string, unknown> | null;
  meta?: string | Record<string, unknown> | null;
};

type GenerationFailure = {
  ok: false;
  error: string;
  errorType: "validation" | "edit_failed" | "api";
  failedEdit?: EditOperation;
};

type GenerationSuccess = {
  ok: true;
  componentCode: string;
  schema: string;
  meta: string;
  summary: string;
  tokensUsed?: number;
  metadata: {
    skills: string[];
    injectedSkills: string[];
    skippedSkills: string[];
    editType: "tool_edit" | "full_replacement";
    edits?: EditOperation[];
    model: Provider;
  };
};

type GenerationDispatchResult = GenerationFailure | GenerationSuccess;

type ValidationResponse = {
  valid: boolean;
  reason?: string;
};

const editOperationValidator = v.object({
  description: v.string(),
  old_string: v.string(),
  new_string: v.string(),
});

const conversationContentPartValidator = v.union(
  v.object({
    type: v.literal("text"),
    text: v.string(),
  }),
  v.object({
    type: v.literal("image"),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.string()),
    alt: v.optional(v.string()),
  })
);

const conversationMessageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  attachedImages: v.optional(v.array(v.string())),
  contentParts: v.optional(v.array(conversationContentPartValidator)),
});

const errorCorrectionValidator = v.object({
  error: v.string(),
  attemptNumber: v.number(),
  maxAttempts: v.number(),
  failedEdit: v.optional(editOperationValidator),
});

const VALIDATION_SYSTEM_PROMPT = `
You decide whether a user prompt is asking for a motion graphics or animated video preset.

Return JSON only:
{"valid":true}
or
{"valid":false,"reason":"short explanation"}

Mark prompts invalid when they are:
- greetings or chit-chat
- generic coding questions unrelated to animation generation
- empty or too vague to produce a visual preset

Mark prompts valid when they ask for any animated visual, title card, intro, outro,
transition, chart animation, map animation, social video, or motion design.
`;

const FOLLOW_UP_SYSTEM_PROMPT = `
You are editing an existing MotionKit Remotion preset.

Return JSON only, with no markdown fences.

Use this shape:
{
  "type": "edit" | "full",
  "summary": "One sentence describing the change",
  "edits": [
    {
      "description": "what changed",
      "old_string": "exact match from current code",
      "new_string": "replacement"
    }
  ],
  "code": "full replacement component code if type is full",
  "schema": {... optional updated schema object ...},
  "meta": {... optional updated meta object ...}
}

Rules:
- Use "edit" for targeted component changes where exact search/replace operations are reliable.
- Use "full" for bigger restructures OR when schema/meta must change.
- old_string must match the current code exactly, including whitespace.
- Preserve manual user edits unless the request explicitly changes them.
- If the request mentions duration, fps, dimensions, new controls, removed controls, or new defaults,
  choose "full" and include updated schema/meta when needed.
`;

function stripMarkdownFences(value: string): string {
  let result = value.trim();
  result = result.replace(/^```(?:json|tsx|ts|jsx|js|typescript|javascript)?\s*/i, "");
  result = result.replace(/\s*```\s*$/i, "");
  return result.trim();
}

function extractFirstJsonObject(value: string): string {
  const source = stripMarkdownFences(value);
  const startIndex = source.indexOf("{");
  if (startIndex === -1) {
    throw new Error(
      `No JSON object found in AI response. Raw: ${source.slice(0, 200)}`
    );
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (!escaped && char === '"') {
        inString = false;
      }
      escaped = !escaped && char === "\\";
      continue;
    }

    if (char === '"') {
      inString = true;
      escaped = false;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  // Include a tail snippet so callers can see where it actually cut off —
  // most commonly a maxOutputTokens ceiling or a provider returning a
  // non-JSON response wrapped in prose.
  throw new Error(
    `Unterminated JSON object in AI response. Length: ${source.length}, tail: ...${source.slice(-200)}`
  );
}

function parseJsonObject<T>(value: string): T {
  const candidate = extractFirstJsonObject(value);
  return JSON.parse(candidate) as T;
}

function validateJsonString(_sectionName: string, value: string): string {
  const cleaned = stripMarkdownFences(value);
  JSON.parse(cleaned);
  return cleaned;
}

function normalizeJsonSection(
  fieldName: "schema" | "meta",
  value: string | Record<string, unknown> | null | undefined,
  fallback?: string
) {
  if (value === undefined || value === null) {
    if (!fallback) {
      throw new Error(`Missing ${fieldName} in follow-up response`);
    }
    return fallback;
  }

  if (typeof value === "string") {
    return validateJsonString(fieldName, value);
  }

  return JSON.stringify(value);
}

function getLineNumber(code: string, searchString: string): number {
  const index = code.indexOf(searchString);
  if (index === -1) {
    return -1;
  }

  return code.slice(0, index).split("\n").length;
}

function applyEdits(code: string, edits: EditOperation[]) {
  let result = code;
  const enrichedEdits: EditOperation[] = [];

  for (let index = 0; index < edits.length; index += 1) {
    const edit = edits[index];
    if (!result.includes(edit.old_string)) {
      return {
        success: false as const,
        result: code,
        error: `Edit ${index + 1} failed: Could not find the specified text`,
        failedEdit: edit,
      };
    }

    const matches = result.split(edit.old_string).length - 1;
    if (matches > 1) {
      return {
        success: false as const,
        result: code,
        error: `Edit ${index + 1} failed: Found ${matches} matches. The edit target is ambiguous.`,
        failedEdit: edit,
      };
    }

    const lineNumber = getLineNumber(result, edit.old_string);
    result = result.replace(edit.old_string, edit.new_string);
    enrichedEdits.push({
      ...edit,
      lineNumber,
    });
  }

  return {
    success: true as const,
    result,
    enrichedEdits,
  };
}

function autoDetectCategory(prompt: string): string {
  const normalized = prompt.toLowerCase();

  if (/\b(map|country|countries|world|globe|route|flight|city|cities|state|region)\b/.test(normalized)) {
    return "map";
  }
  if (/\b(chart|graph|bar chart|line chart|pie chart|data|statistic|metric|kpi)\b/.test(normalized)) {
    return "chart";
  }
  if (/\b(transition|wipe|swipe|cross ?fade|morph between)\b/.test(normalized)) {
    return "transition";
  }
  if (/\b(cta|call ?to ?action|subscribe|sign ?up|click here|buy now|learn more)\b/.test(normalized)) {
    return "cta";
  }
  if (/\b(lower ?third|name ?card|speaker name|banner)\b/.test(normalized)) {
    return "lower-third";
  }
  if (/\b(outro|end ?screen|thanks for watching)\b/.test(normalized)) {
    return "outro";
  }
  if (/\b(intro|opener|opening|channel intro)\b/.test(normalized)) {
    return "intro";
  }
  if (/\b(instagram|reel|tiktok|story|post|social media)\b/.test(normalized)) {
    return "social";
  }
  if (/\b(title|headline|headline card|title card)\b/.test(normalized)) {
    return "title";
  }

  return "title";
}

function injectStyleContract(prompt: string, style: string | undefined): string {
  if (!style || style === "auto") {
    return prompt;
  }

  // Sanitize the style identifier before interpolating it into the system
  // prompt. `style` is user-controllable and without this check an attacker
  // could inject newlines/quotes/free-form text to steer the model. Restrict
  // to the character set real style keys use (`noir`, `pastel_90s`,
  // `brand/primary`) and cap the length. If nothing remains we drop the
  // style hint rather than emitting a malformed one.
  const safeStyle = style.replace(/[^a-zA-Z0-9_\-/.]/g, "").slice(0, 64);
  if (!safeStyle) return prompt;

  return [
    `STYLE CONTRACT: Use styleHelpers.getStyle("${safeStyle}") at the top of your component`,
    `and derive background, text color, accent color, font family, and motion feel`,
    `from the returned tokens. This keeps every generation in this style visually consistent.`,
    `Reference style key: "${safeStyle}".`,
    "",
    "USER PROMPT:",
    prompt,
  ].join("\n");
}

async function fetchImageData(referenceImageUrl: string): Promise<ImageData | null> {
  try {
    const response = await fetch(referenceImageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return {
      mimeType: response.headers.get("content-type") || "image/png",
      data: btoa(binary),
    };
  } catch (error) {
    console.warn("Failed to fetch reference image for AI generation:", error);
    return null;
  }
}

async function fetchImageDataList(referenceImageUrls?: string[]) {
  if (!referenceImageUrls || referenceImageUrls.length === 0) {
    return [];
  }

  const images = await Promise.all(
    referenceImageUrls.slice(0, 4).map((url) => fetchImageData(url))
  );

  return images.filter((image): image is ImageData => Boolean(image));
}

async function runJsonPrompt<T>(input: {
  provider: Provider;
  apiKey: string;
  systemPrompt: string;
  prompt: string;
  referenceImageUrls?: string[];
  temperature?: number;
  maxOutputTokens?: number;
  openRouterModel?: string;
}) {
  const {
    provider,
    apiKey,
    systemPrompt,
    prompt,
    referenceImageUrls,
    temperature = 0.2,
    maxOutputTokens = 2048,
    openRouterModel,
  } = input;

  const imageData = await fetchImageDataList(referenceImageUrls);

  if (provider === "openrouter") {
    const resolvedModel = resolveOpenRouterModel(openRouterModel);
    if (!resolvedModel) {
      throw new Error(
        "OpenRouter model id is missing. Set it in Settings → API Keys."
      );
    }
    const messages: Array<{
      role: "system" | "user";
      content:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string } }
          >;
    }> = [
      { role: "system", content: systemPrompt },
    ];
    if (imageData.length === 0) {
      messages.push({ role: "user", content: prompt });
    } else {
      const parts: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      > = [{ type: "text", text: prompt }];
      for (const img of imageData) {
        parts.push({
          type: "image_url",
          image_url: {
            url: `data:${img.mimeType};base64,${img.data}`,
          },
        });
      }
      messages.push({ role: "user", content: parts });
    }
    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.SITE_URL ?? "https://motionkit.app",
          "X-Title": "MotionKit",
        },
        body: JSON.stringify({
          model: resolvedModel,
          temperature,
          max_tokens: maxOutputTokens,
          messages,
          // OpenAI-compatible JSON mode. Most modern providers routed
          // through OpenRouter honor it; ones that don't simply ignore
          // the field and fall back on our system-prompt contract.
          response_format: { type: "json_object" },
        }),
      }
    );
    const rawText = await res.text();
    let payload: {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
      error?: { message?: string };
    };
    try {
      payload = JSON.parse(rawText);
    } catch {
      throw new Error(
        `OpenRouter returned non-JSON (${res.status}): ${rawText.slice(0, 300)}`
      );
    }
    if (!res.ok || payload.error) {
      throw new Error(
        `OpenRouter error: ${payload.error?.message ?? res.status}`
      );
    }
    const text = payload.choices?.[0]?.message?.content ?? "";
    return {
      object: parseJsonObject<T>(text),
      tokensUsed:
        payload.usage?.total_tokens ??
        (payload.usage?.prompt_tokens ?? 0) +
          (payload.usage?.completion_tokens ?? 0),
    };
  }

  if (provider === "gemini") {
    const genAI = new GoogleGenerativeAI(apiKey);

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
    ];

    for (const image of imageData) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      });
    }

    const { result } = await callGeminiWithFallback(genAI, () => ({
      contents: [{ role: "user", parts }],
      systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
      // `thinkingConfig` isn't in this SDK's type defs (legacy
      // @google/generative-ai), but the Gemini REST API accepts it. On
      // Gemini 3 Flash the model silently burns thinking tokens before
      // emitting output, and they count against maxOutputTokens — which
      // caused truncated JSON like `{"optimized":"...` with no close.
      // "minimal" is the lowest level Gemini 3 Flash supports; thinking
      // cannot be fully disabled on this model family.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: "minimal" },
      } as any,
    }));

    const response = result.response;
    const text = response.text();
    const tokensUsed =
      (response.usageMetadata?.promptTokenCount ?? 0) +
      (response.usageMetadata?.candidatesTokenCount ?? 0);

    return {
      object: parseJsonObject<T>(text),
      tokensUsed,
    };
  }

  const client = new Anthropic({ apiKey });
  const content: Anthropic.Messages.ContentBlockParam[] = [];

  for (const image of imageData) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
        data: image.data,
      },
    });
  }

  content.push({
    type: "text",
    text: prompt,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content,
      },
    ],
    max_tokens: maxOutputTokens,
    temperature,
  });

  const text = response.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    object: parseJsonObject<T>(text),
    tokensUsed: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
  };
}

async function validatePromptWithProvider(input: {
  provider: Provider;
  apiKey: string;
  prompt: string;
  openRouterModel?: string;
}) {
  const trimmed = input.prompt.trim();
  if (trimmed.length < 8) {
    return {
      valid: false,
      reason: "Please describe the motion graphic you want to create in a bit more detail.",
    };
  }

  try {
    const result = await runJsonPrompt<ValidationResponse>({
      provider: input.provider,
      apiKey: input.apiKey,
      systemPrompt: VALIDATION_SYSTEM_PROMPT,
      prompt: `User prompt: "${trimmed}"`,
      maxOutputTokens: 128,
      temperature: 0,
      openRouterModel: input.openRouterModel,
    });

    return result.object;
  } catch (error) {
    console.warn("Prompt validation failed, allowing request through:", error);
    return { valid: true } satisfies ValidationResponse;
  }
}

function buildFollowUpPrompt(input: {
  prompt: string;
  currentCode: string;
  conversationHistory: ConversationContextMessage[];
  hasManualEdits: boolean;
  errorCorrection?: ErrorCorrectionContext;
}) {
  const recentMessages = input.conversationHistory.slice(-6);
  const conversationContext =
    recentMessages.length > 0
      ? "\n\n## RECENT CONVERSATION\n" +
        recentMessages
          .map((message) => {
            const imageCount =
              message.contentParts?.filter((part) => part.type === "image").length ??
              message.attachedImages?.length ??
              0;
            const imageSuffix =
              imageCount > 0
                ? ` [Attached ${imageCount} reference image${imageCount > 1 ? "s" : ""}]`
                : "";
            return `${message.role.toUpperCase()}: ${message.content}${imageSuffix}`;
          })
          .join("\n")
      : "";

  const manualEditNotice = input.hasManualEdits
    ? "\n\nNOTE: The user has made manual edits to the code. Preserve them unless the request explicitly changes them."
    : "";

  let errorCorrectionNotice = "";
  if (input.errorCorrection) {
    const failedEditDetails = input.errorCorrection.failedEdit
      ? [
          "",
          `Previous failed edit: ${input.errorCorrection.failedEdit.description}`,
          `old_string: ${input.errorCorrection.failedEdit.old_string}`,
          `new_string: ${input.errorCorrection.failedEdit.new_string}`,
        ].join("\n")
      : "";

    if (
      input.errorCorrection.error.includes("Edit") &&
      input.errorCorrection.error.includes("failed")
    ) {
      errorCorrectionNotice = `

## EDIT FAILED (ATTEMPT ${input.errorCorrection.attemptNumber}/${input.errorCorrection.maxAttempts})
${input.errorCorrection.error}
${failedEditDetails}

Use more surrounding context in old_string and make every edit target unique.
`;
    } else {
      errorCorrectionNotice = `

## COMPILATION ERROR (ATTEMPT ${input.errorCorrection.attemptNumber}/${input.errorCorrection.maxAttempts})
${input.errorCorrection.error}

Focus on fixing the compile/runtime error before making other changes.
`;
    }
  }

  return `## CURRENT CODE
\`\`\`tsx
${input.currentCode}
\`\`\`${conversationContext}${manualEditNotice}${errorCorrectionNotice}

## USER REQUEST
${input.prompt}`;
}

async function resolveConversationImageUrls(
  ctx: ActionCtx,
  conversationHistory: ConversationContextMessage[]
) {
  const urls = new Set<string>();

  for (const message of conversationHistory) {
    if (!message.contentParts) {
      continue;
    }

    for (const part of message.contentParts) {
      if (part.type !== "image") {
        continue;
      }

      if (part.storageId) {
        try {
          const storageUrl = await ctx.storage.getUrl(part.storageId as Id<"_storage">);
          if (storageUrl) {
            urls.add(storageUrl);
          }
        } catch (error) {
          console.warn("Failed to resolve conversation image storage ID:", error);
        }
      }

      if (part.imageUrl) {
        urls.add(part.imageUrl);
      }
    }
  }

  return Array.from(urls).slice(0, 4);
}

async function runInitialGeneration(input: {
  provider: Provider;
  apiKey: string;
  prompt: string;
  systemPrompt: string;
  referenceImageUrls?: string[];
  openRouterModel?: string;
}) {
  if (input.provider === "gemini") {
    return generateWithGemini(
      { apiKey: input.apiKey },
      {
        prompt: input.prompt,
        systemPrompt: input.systemPrompt,
        referenceImageUrls: input.referenceImageUrls,
      }
    );
  }

  if (input.provider === "openrouter") {
    return generateWithOpenRouter(
      { apiKey: input.apiKey, model: input.openRouterModel ?? "" },
      {
        prompt: input.prompt,
        systemPrompt: input.systemPrompt,
        referenceImageUrls: input.referenceImageUrls,
      }
    );
  }

  return generateWithClaude(
    { apiKey: input.apiKey },
    {
      prompt: input.prompt,
      systemPrompt: input.systemPrompt,
      referenceImageUrls: input.referenceImageUrls,
    }
  );
}

async function runFollowUpGeneration(input: {
  provider: Provider;
  apiKey: string;
  systemPrompt: string;
  prompt: string;
  currentCode: string;
  currentSchema: string;
  currentMeta: string;
  conversationHistory: ConversationContextMessage[];
  hasManualEdits: boolean;
  errorCorrection?: ErrorCorrectionContext;
  referenceImageUrls?: string[];
  openRouterModel?: string;
}) {
  const promptText = buildFollowUpPrompt({
    prompt: input.prompt,
    currentCode: input.currentCode,
    conversationHistory: input.conversationHistory,
    hasManualEdits: input.hasManualEdits,
    errorCorrection: input.errorCorrection,
  });

  const result = await runJsonPrompt<FollowUpResponse>({
    provider: input.provider,
    apiKey: input.apiKey,
    systemPrompt: `${FOLLOW_UP_SYSTEM_PROMPT}\n\n## PRESET CONTRACT REMINDERS\n${input.systemPrompt}`,
    prompt: promptText,
    referenceImageUrls: input.referenceImageUrls,
    maxOutputTokens: 4096,
    openRouterModel: input.openRouterModel,
  });

  const response = result.object;
  if (response.type === "edit" && response.edits?.length) {
    const editResult = applyEdits(input.currentCode, response.edits);
    if (!editResult.success) {
      return {
        ok: false as const,
        error: editResult.error,
        errorType: "edit_failed" as const,
        failedEdit: editResult.failedEdit,
      };
    }

    return {
      ok: true as const,
      componentCode: editResult.result,
      schema: input.currentSchema,
      meta: input.currentMeta,
      summary: response.summary,
      tokensUsed: result.tokensUsed,
      editType: "tool_edit" as const,
      edits: editResult.enrichedEdits,
    };
  }

  if (response.type === "full" && response.code) {
    return {
      ok: true as const,
      componentCode: stripMarkdownFences(response.code),
      schema: normalizeJsonSection("schema", response.schema, input.currentSchema),
      meta: normalizeJsonSection("meta", response.meta, input.currentMeta),
      summary: response.summary,
      tokensUsed: result.tokensUsed,
      editType: "full_replacement" as const,
      edits: undefined,
    };
  }

  return {
    ok: false as const,
    error: "Invalid AI follow-up response: missing edits or replacement code",
    errorType: "api" as const,
  };
}

async function markGenerationFailed(
  ctx: { runMutation: ActionCtx["runMutation"] },
  generationId: Id<"aiGenerations">,
  error: string
) {
  await ctx.runMutation(internal.aiGeneration.markFailed, {
    generationId,
    error,
  });
}

export const create = mutation({
  args: {
    userId: v.id("users"),
    prompt: v.string(),
    category: v.optional(categoryValidator),
    style: v.optional(v.string()),
    referenceImageId: v.optional(v.id("_storage")),
    provider: v.union(
      v.literal("gemini"),
      v.literal("claude"),
      v.literal("openrouter"),
    ),
    parentGenerationId: v.optional(v.id("aiGenerations")),
  },
  handler: async (ctx, args) => {
    await requireAuthorizedUser(ctx, args.userId);

    const parentGeneration = args.parentGenerationId
      ? await ctx.db.get(args.parentGenerationId)
      : null;

    if (parentGeneration && parentGeneration.userId !== args.userId) {
      throw new Error("You can only iterate on your own generations");
    }

    const iterationNumber = args.parentGenerationId
      ? (parentGeneration?.iterationNumber ?? 0) + 1
      : 1;

    return await ctx.db.insert("aiGenerations", {
      ...args,
      status: "generating",
      iterationNumber,
    });
  },
});

export const dispatch = action({
  args: {
    generationId: v.id("aiGenerations"),
    prompt: v.string(),
    category: v.optional(v.string()),
    style: v.optional(v.string()),
    provider: v.union(
      v.literal("gemini"),
      v.literal("claude"),
      v.literal("openrouter"),
    ),
    parentGenerationId: v.optional(v.id("aiGenerations")),
    currentCode: v.optional(v.string()),
    conversationHistory: v.optional(v.array(conversationMessageValidator)),
    hasManualEdits: v.optional(v.boolean()),
    errorCorrection: v.optional(errorCorrectionValidator),
    previouslyUsedSkills: v.optional(v.array(v.string())),
    /**
     * Optional free-text instructions appended to the system prompt before
     * the model is called. Lets advanced users nudge tone, constraints, or
     * house style without editing the generator itself.
     */
    customSystemPrompt: v.optional(v.string()),
    /**
     * For `provider === "openrouter"`, overrides the model id stored on the
     * user's account. Lets the Create page's Advanced section pass a
     * per-request model without making the user re-save Settings.
     */
    openRouterModelOverride: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GenerationDispatchResult> => {
    const generationId = args.generationId;

    try {
      const authUserId = await requireAuthUserIdFromAction(ctx);
      const generation = await ctx.runQuery(internal.aiGeneration.getInternal, {
        id: generationId,
      });

      if (!generation) {
        return {
          ok: false,
          error: "Generation not found",
          errorType: "api",
        };
      }

      if (generation.userId !== authUserId) {
        return {
          ok: false,
          error: "You do not have access to this generation",
          errorType: "api",
        };
      }

      const userKeys = await ctx.runQuery(internal.users.getApiKeys, {
        userId: authUserId,
      });

      const provider = args.provider;
      let apiKey: string | null | undefined;
      let resolvedOpenRouterModel: string | undefined;
      // BYOK-only: no platform env fallback. MotionKit is free and cannot
      // subsidize third-party inference. See convex/actions/generatePreset.ts
      // for the matching policy on the dispatch action.
      if (provider === "gemini") {
        apiKey = userKeys?.geminiApiKey ?? null;
      } else if (provider === "claude") {
        apiKey = userKeys?.anthropicApiKey ?? null;
      } else {
        apiKey = userKeys?.openRouterApiKey ?? null;
        resolvedOpenRouterModel = resolveOpenRouterModel(
          args.openRouterModelOverride,
          userKeys?.openRouterModel,
          undefined
        );
      }

      if (!apiKey) {
        const keyName =
          provider === "gemini"
            ? "Google Gemini API key"
            : provider === "claude"
              ? "Anthropic (Claude) API key"
              : "OpenRouter API key";
        const error = `BYOK required: add your ${keyName} in Settings → API Keys. MotionKit is free and does not subsidize model inference.`;
        await markGenerationFailed(ctx, generationId, error);
        return {
          ok: false,
          error,
          errorType: "api",
        };
      }

      if (provider === "openrouter" && !resolvedOpenRouterModel) {
        const error =
          "OpenRouter requires a model id. Set one in Settings → API Keys or pass an Advanced override on the Create page.";
        await markGenerationFailed(ctx, generationId, error);
        return {
          ok: false,
          error,
          errorType: "api",
        };
      }

      const resolvedCategory =
        !args.category || args.category === "auto"
          ? autoDetectCategory(args.prompt)
          : args.category;

      const skillPrompt = buildSystemPrompt({
        prompt: args.prompt,
        category: resolvedCategory,
        previouslyUsedSkills: args.previouslyUsedSkills,
      });

      // Advanced: let the user inject extra system-prompt guidance. Appended
      // AFTER the skill prompts so it can override/steer defaults.
      const customExtra = args.customSystemPrompt?.trim();
      const effectiveSystemPrompt = customExtra
        ? `${skillPrompt.systemPrompt}\n\n## USER OVERRIDES\n${customExtra}`
        : skillPrompt.systemPrompt;

      const effectivePrompt = injectStyleContract(args.prompt, args.style);

      let parentGeneration = null;
      if (args.parentGenerationId) {
        parentGeneration = await ctx.runQuery(internal.aiGeneration.getInternal, {
          id: args.parentGenerationId,
        });

        if (!parentGeneration) {
          const error = "Parent generation not found";
          await markGenerationFailed(ctx, generationId, error);
          return {
            ok: false,
            error,
            errorType: "api",
          };
        }

        if (parentGeneration.userId !== authUserId) {
          const error = "You do not have access to the parent generation";
          await markGenerationFailed(ctx, generationId, error);
          return {
            ok: false,
            error,
            errorType: "api",
          };
        }
      }

      const currentCode = args.currentCode ?? parentGeneration?.generatedCode;
      const referenceImageId = generation.referenceImageId ?? parentGeneration?.referenceImageId;
      const referenceImageUrl = referenceImageId
        ? (await ctx.storage.getUrl(referenceImageId)) ?? undefined
        : undefined;
      const conversationImageUrls = await resolveConversationImageUrls(
        ctx,
        (args.conversationHistory ?? []) as ConversationContextMessage[]
      );
      const referenceImageUrls = Array.from(
        new Set([
          ...(referenceImageUrl ? [referenceImageUrl] : []),
          ...conversationImageUrls,
        ])
      ).slice(0, 4);

      if (!currentCode || !args.parentGenerationId) {
        const validation = await validatePromptWithProvider({
          provider,
          apiKey,
          prompt: args.prompt,
          openRouterModel: resolvedOpenRouterModel,
        });

        if (!validation.valid) {
          const error =
            validation.reason ||
            "No valid motion graphics prompt. Describe the animation or visual you want to create.";
          await markGenerationFailed(ctx, generationId, error);
          return {
            ok: false,
            error,
            errorType: "validation",
          };
        }

        const generated = await runInitialGeneration({
          provider,
          apiKey,
          prompt: effectivePrompt,
          systemPrompt: effectiveSystemPrompt,
          referenceImageUrls,
          openRouterModel: resolvedOpenRouterModel,
        });

        await ctx.runMutation(internal.aiGeneration.markComplete, {
          generationId,
          generatedCode: generated.componentCode,
          generatedSchema: generated.schema,
          generatedMeta: generated.meta,
          tokensUsed: generated.tokensUsed,
        });

        return {
          ok: true,
          componentCode: generated.componentCode,
          schema: generated.schema,
          meta: generated.meta,
          summary: `Generated a ${resolvedCategory} preset from the latest prompt.`,
          tokensUsed: generated.tokensUsed,
          metadata: {
            skills: skillPrompt.detectedSkills,
            injectedSkills: skillPrompt.injectedSkills,
            skippedSkills: skillPrompt.skippedSkills,
            editType: "full_replacement",
            model: provider,
          },
        };
      }

      if (!parentGeneration?.generatedSchema || !parentGeneration.generatedMeta) {
        const error = "Parent generation is missing schema or metadata required for follow-up edits.";
        await markGenerationFailed(ctx, generationId, error);
        return {
          ok: false,
          error,
          errorType: "api",
        };
      }

      const currentSchema = parentGeneration.generatedSchema;
      const currentMeta = parentGeneration.generatedMeta;

      const followUp = await runFollowUpGeneration({
        provider,
        apiKey,
        systemPrompt: effectiveSystemPrompt,
        prompt: effectivePrompt,
        currentCode,
        currentSchema,
        currentMeta,
        conversationHistory: (args.conversationHistory ?? []) as ConversationContextMessage[],
        hasManualEdits: Boolean(args.hasManualEdits),
        errorCorrection: args.errorCorrection as ErrorCorrectionContext | undefined,
        referenceImageUrls,
        openRouterModel: resolvedOpenRouterModel,
      });

      if (!followUp.ok) {
        await markGenerationFailed(ctx, generationId, followUp.error);
        return followUp;
      }

      await ctx.runMutation(internal.aiGeneration.markComplete, {
        generationId,
        generatedCode: followUp.componentCode,
        generatedSchema: followUp.schema,
        generatedMeta: followUp.meta,
        tokensUsed: followUp.tokensUsed,
      });

      return {
        ok: true,
        componentCode: followUp.componentCode,
        schema: followUp.schema,
        meta: followUp.meta,
        summary: followUp.summary,
        tokensUsed: followUp.tokensUsed,
        metadata: {
          skills: skillPrompt.detectedSkills,
          injectedSkills: skillPrompt.injectedSkills,
          skippedSkills: skillPrompt.skippedSkills,
          editType: followUp.editType,
          edits: followUp.edits,
          model: provider,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      await markGenerationFailed(ctx, generationId, errorMessage);
      return {
        ok: false,
        error: errorMessage,
        errorType: "api",
      };
    }
  },
});

export const get = query({
  args: { id: v.id("aiGenerations") },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.id);
    if (!generation) return null;

    await requireAuthorizedUser(ctx, generation.userId);
    return generation;
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("aiGenerations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuthorizedUser(ctx, args.userId);

    return await ctx.db
      .query("aiGenerations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

export const markComplete = internalMutation({
  args: {
    generationId: v.id("aiGenerations"),
    generatedCode: v.string(),
    generatedSchema: v.string(),
    generatedMeta: v.string(),
    tokensUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { generationId, ...updates } = args;
    await ctx.db.patch(generationId, {
      ...updates,
      status: "complete",
    });
  },
});

export const markFailed = internalMutation({
  args: {
    generationId: v.id("aiGenerations"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.generationId, {
      status: "failed",
      error: args.error,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireSignedInUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// ---------------------------------------------------------------------------
// Prompt optimization
// ---------------------------------------------------------------------------

const OPTIMIZE_PROMPT_SYSTEM = `You are an expert prompt engineer for a Remotion-based AI motion graphics generator.

Rewrite the user's draft prompt so the generator produces a striking, production-quality result. The rewritten prompt MUST be:
- Visually specific: palette (describe or hex), typography (weight, serif/sans, casing), composition, canvas ratio if implied
- Motion-specific: entry/exit behavior, timing, easing ("spring", "ease-out", "elastic"), staggering, hold time
- Style-specific: one of editorial, cinematic, broadcast, corporate, minimal, retro, futuristic, vibrant, warm — pick what fits
- Concise: 2 to 3 sentences, strictly 40 to 70 words — never longer
- Faithful: preserve the user's subject, brand, numbers, or labels exactly — do NOT invent content they did not mention
- Self-contained: no preamble, no "Optimized prompt:", no markdown

If the user mentions a data visualization (chart, map, etc.), call that out explicitly and keep their data verbatim.

Return ONLY a JSON object with this exact shape:
{"optimized": "the rewritten prompt"}`;

export const optimizePrompt = action({
  args: {
    userId: v.id("users"),
    prompt: v.string(),
    provider: v.union(
      v.literal("gemini"),
      v.literal("claude"),
      v.literal("openrouter")
    ),
    category: v.optional(v.string()),
    openRouterModelOverride: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    { ok: true; optimizedPrompt: string } | { ok: false; error: string }
  > => {
    const authUserId = await requireAuthUserIdFromAction(ctx);
    if (authUserId !== args.userId) {
      return { ok: false, error: "Not authorized." };
    }

    const trimmed = args.prompt.trim();
    if (trimmed.length < 4) {
      return { ok: false, error: "Prompt is too short to optimize." };
    }
    if (trimmed.length > 2000) {
      return {
        ok: false,
        error: "Prompt is too long to optimize (max 2000 chars).",
      };
    }

    const userKeys = await ctx.runQuery(internal.users.getApiKeys, {
      userId: authUserId,
    });

    let apiKey: string | null | undefined;
    let resolvedOpenRouterModel: string | undefined;
    if (args.provider === "gemini") {
      apiKey = userKeys?.geminiApiKey || process.env.GOOGLE_API_KEY;
    } else if (args.provider === "claude") {
      apiKey = userKeys?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    } else {
      apiKey =
        userKeys?.openRouterApiKey || process.env.OPENROUTER_API_KEY || null;
      resolvedOpenRouterModel = resolveOpenRouterModel(
        args.openRouterModelOverride,
        userKeys?.openRouterModel,
        process.env.OPENROUTER_DEFAULT_MODEL
      );
    }

    if (!apiKey) {
      const keyName =
        args.provider === "gemini"
          ? "Google API key"
          : args.provider === "claude"
            ? "Anthropic API key"
            : "OpenRouter API key";
      return {
        ok: false,
        error: `No ${keyName} found. Add it in Settings → API Keys.`,
      };
    }

    if (args.provider === "openrouter" && !resolvedOpenRouterModel) {
      return {
        ok: false,
        error:
          "OpenRouter requires a model id. Set one in Settings → API Keys.",
      };
    }

    const userMessage = `Category hint: ${args.category ?? "auto"}\n\nDraft prompt:\n${trimmed}`;

    try {
      const result = await runJsonPrompt<{ optimized: string }>({
        provider: args.provider,
        apiKey,
        systemPrompt: OPTIMIZE_PROMPT_SYSTEM,
        prompt: userMessage,
        temperature: 0.7,
        // Gemini 3 Flash Preview burns "thinking" tokens from this same
        // budget before emitting the JSON. The rewrite itself is short
        // (40-70 words ≈ 120 output tokens), but thinking can consume
        // several hundred more. 4096 is safe headroom — well under the
        // model's 65k output cap but large enough that truncation is
        // practically impossible for a short JSON response.
        maxOutputTokens: 4096,
        openRouterModel: resolvedOpenRouterModel,
      });
      const optimized = result.object?.optimized?.trim();
      if (!optimized) {
        return { ok: false, error: "Optimizer returned an empty result." };
      }
      return { ok: true, optimizedPrompt: optimized };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Prompt optimization failed.",
      };
    }
  },
});
