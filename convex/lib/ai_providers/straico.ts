import type {
  AIProviderConfig,
  GenerationRequest,
  GenerationResult,
} from "./types";

/**
 * Straico-routed Gemini 3 Flash provider.
 *
 * Unlike the other providers in this folder, Straico is a *platform* key —
 * the API key lives in the STRAICO_API_KEY env var on the Convex deployment,
 * not on individual user docs. The accompanying dispatch action
 * (convex/aiGenerationStraico.ts) enforces a 5-generations/day per-user cap
 * so the platform wallet isn't drained by a single caller.
 *
 * We intentionally do NOT share code with convex/lib/ai_providers/gemini.ts:
 * Google's direct SDK and Straico's HTTP API have different request shapes,
 * different error contracts, and different billing models, and the product
 * guidance was to keep them as parallel but independent scripts.
 */
const STRAICO_MODEL = "google/gemini-3-flash-preview";
// OpenAI-compatible chat completions. Unlike `/v0/prompt/completion` (which
// takes a single `message` string and strips system-role semantics), this
// endpoint accepts a proper `messages: [{role, content}]` array so Gemini
// sees the MotionKit system prompt as a real system instruction. Output
// quality on the strict ---COMPONENT---/---SCHEMA---/---META--- format
// noticeably better with the role separation preserved.
const STRAICO_ENDPOINT = "https://api.straico.com/v0/chat/completions";

const OVERLOAD_MESSAGE =
  "Straico is currently overloaded and can't process this request. " +
  "Please wait a moment and try again. You can also add your own Gemini API key " +
  "in Settings → API Keys to bypass the shared Straico quota.";

// OpenAI-compatible response shape from /v0/chat/completions.
type StraicoCompletion = {
  choices?: Array<{
    message?: { content?: string };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: string | { message?: string };
};

type StraicoMessagePart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type StraicoMessage = {
  role: "system" | "user" | "assistant";
  content: string | StraicoMessagePart[];
};

function isStraicoOverloaded(status: number, body: string): boolean {
  if (status === 429 || status === 500 || status === 503) return true;
  return /overload|unavailable|rate.?limit|high demand/i.test(body);
}

/**
 * Parses ---COMPONENT--- / ---SCHEMA--- / ---META--- delimited response.
 * Mirrors the parser in gemini.ts so the preset contract stays consistent.
 */
function parseResponse(raw: string): {
  componentCode: string;
  schema: string;
  meta: string;
} {
  const componentMatch = raw.match(
    /---COMPONENT---\s*([\s\S]*?)\s*---SCHEMA---/
  );
  const schemaMatch = raw.match(/---SCHEMA---\s*([\s\S]*?)\s*---META---/);
  const metaMatch = raw.match(/---META---\s*([\s\S]*?)$/);

  if (!componentMatch || !schemaMatch || !metaMatch) {
    throw new Error(
      "Failed to parse Straico response: missing required sections. " +
        "Expected ---COMPONENT---, ---SCHEMA---, and ---META--- delimiters."
    );
  }

  const stripFences = (s: string) =>
    s
      .replace(/^```(?:json|tsx|typescript|javascript)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

  const componentCode = stripFences(componentMatch[1].trim());
  const schema = stripFences(schemaMatch[1].trim());
  const meta = stripFences(metaMatch[1].trim());

  try {
    JSON.parse(schema);
  } catch {
    throw new Error(
      "Schema section is not valid JSON: " + schema.slice(0, 200)
    );
  }
  try {
    JSON.parse(meta);
  } catch {
    throw new Error("Meta section is not valid JSON: " + meta.slice(0, 200));
  }

  return { componentCode, schema, meta };
}

/**
 * Build an OpenAI-compatible messages array with proper role separation.
 * System prompt goes in a system message (honored as system instruction by
 * Gemini via Straico) and user content goes in a user message. Prior code
 * is appended to the user turn as context so the model can iterate on it.
 */
function buildMessages(
  request: GenerationRequest,
  imageDataUrls: string[]
): StraicoMessage[] {
  const messages: StraicoMessage[] = [
    { role: "system", content: request.systemPrompt },
  ];

  const userTextParts: string[] = [];
  if (request.previousCode) {
    userTextParts.push("=== PREVIOUS CODE (iterate on this) ===");
    userTextParts.push(request.previousCode);
    userTextParts.push("=== END PREVIOUS CODE ===");
    userTextParts.push(
      "Please improve or modify the above code based on my new instructions."
    );
    userTextParts.push("");
  }
  userTextParts.push(request.prompt);
  const userText = userTextParts.join("\n");

  if (imageDataUrls.length === 0) {
    messages.push({ role: "user", content: userText });
  } else {
    const parts: StraicoMessagePart[] = [{ type: "text", text: userText }];
    for (const url of imageDataUrls) {
      parts.push({ type: "image_url", image_url: { url } });
    }
    messages.push({ role: "user", content: parts });
  }

  return messages;
}

async function callStraico(
  apiKey: string,
  body: Record<string, unknown>
): Promise<StraicoCompletion> {
  const backoffsMs = [0, 1500, 4000];
  let lastError: Error | null = null;

  for (const delay of backoffsMs) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));

    const res = await fetch(STRAICO_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const rawText = await res.text();

    if (!res.ok) {
      if (isStraicoOverloaded(res.status, rawText)) {
        lastError = new Error(
          `Straico ${res.status}: ${rawText.slice(0, 300)}`
        );
        console.warn("[straico] transient error, retrying...", lastError.message);
        continue;
      }
      throw new Error(`Straico ${res.status}: ${rawText.slice(0, 500)}`);
    }

    let payload: StraicoCompletion;
    try {
      payload = JSON.parse(rawText) as StraicoCompletion;
    } catch {
      throw new Error(
        `Straico returned non-JSON (${res.status}): ${rawText.slice(0, 300)}`
      );
    }
    if (payload.error) {
      const msg =
        typeof payload.error === "string"
          ? payload.error
          : payload.error.message || "Unknown Straico error";
      throw new Error(`Straico error: ${msg}`);
    }
    return payload;
  }

  const friendly = new Error(OVERLOAD_MESSAGE);
  (friendly as Error & { cause?: unknown }).cause = lastError;
  throw friendly;
}

/**
 * Fetch a reference image and return it as a base64 data URL. Straico's
 * OpenAI-compat endpoint expects inline data URLs for vision input (same
 * convention as OpenAI/OpenRouter).
 */
async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const mime = res.headers.get("content-type") || "image/png";
    const b64 = Buffer.from(buf).toString("base64");
    return `data:${mime};base64,${b64}`;
  } catch (e) {
    console.warn("Failed to fetch reference image for Straico:", e);
    return null;
  }
}

/**
 * Generate a Remotion preset via Straico (Gemini 3 Flash backend).
 * System prompt is passed as a real system message so the model honors the
 * MotionKit output contract; reference images are inlined as data URLs.
 */
export async function generateWithStraico(
  config: AIProviderConfig,
  request: GenerationRequest
): Promise<GenerationResult> {
  const referenceImageUrls = request.referenceImageUrls?.length
    ? request.referenceImageUrls
    : request.referenceImageUrl
      ? [request.referenceImageUrl]
      : [];

  const dataUrls: string[] = [];
  for (const url of referenceImageUrls.slice(0, 4)) {
    const dataUrl = await imageUrlToDataUrl(url);
    if (dataUrl) dataUrls.push(dataUrl);
  }

  const body: Record<string, unknown> = {
    model: STRAICO_MODEL,
    messages: buildMessages(request, dataUrls),
    temperature: 0.7,
    max_tokens: 8192,
  };

  const payload = await callStraico(config.apiKey, body);
  const text = payload.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Straico returned an empty completion");

  const usage = payload.usage;
  const tokensUsed =
    usage?.total_tokens ??
    (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);

  const parsed = parseResponse(text);
  return { ...parsed, tokensUsed };
}

/**
 * Lightweight prompt helper used by the rate-limited dispatch action for
 * prompt-validation calls. Returns the raw string content so the caller can
 * parse JSON (or anything else) on its own terms.
 */
export async function straicoRawCompletion(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options: { maxOutputTokens?: number; temperature?: number } = {}
): Promise<{ text: string; tokensUsed: number }> {
  const body: Record<string, unknown> = {
    model: STRAICO_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (options.maxOutputTokens) body.max_tokens = options.maxOutputTokens;
  if (options.temperature !== undefined) body.temperature = options.temperature;

  const payload = await callStraico(apiKey, body);
  const text = payload.choices?.[0]?.message?.content ?? "";
  const usage = payload.usage;
  const tokensUsed =
    usage?.total_tokens ??
    (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);
  return { text, tokensUsed };
}

export const STRAICO_MODEL_ID = STRAICO_MODEL;
