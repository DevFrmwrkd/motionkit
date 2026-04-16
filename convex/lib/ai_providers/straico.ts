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
const STRAICO_ENDPOINT = "https://api.straico.com/v0/prompt/completion";

const OVERLOAD_MESSAGE =
  "Straico is currently overloaded and can't process this request. " +
  "Please wait a moment and try again. You can also add your own Gemini API key " +
  "in Settings → API Keys to bypass the shared Straico quota.";

type StraicoCompletion = {
  data?: {
    completion?: {
      choices?: Array<{
        message?: { content?: string };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };
  };
  error?: string | { message?: string };
  success?: boolean;
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
 * Straico's v0 endpoint takes a single `message` string (no system role), so
 * we concatenate the system prompt, previous code block, and user prompt into
 * one payload. This matches how the gemini.ts provider builds its prompt but
 * without the native systemInstruction slot.
 */
function buildMessage(request: GenerationRequest): string {
  const parts: string[] = [];

  parts.push("=== SYSTEM INSTRUCTIONS ===");
  parts.push(request.systemPrompt);
  parts.push("=== END SYSTEM INSTRUCTIONS ===");

  if (request.previousCode) {
    parts.push("");
    parts.push("=== PREVIOUS CODE (iterate on this) ===");
    parts.push(request.previousCode);
    parts.push("=== END PREVIOUS CODE ===");
    parts.push(
      "Please improve or modify the above code based on my new instructions."
    );
  }

  parts.push("");
  parts.push("=== USER PROMPT ===");
  parts.push(request.prompt);

  return parts.join("\n");
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
 * Generate a Remotion preset via Straico (Gemini 3 Flash backend).
 * Reference images are passed as `file_urls`; Straico fetches them
 * server-side rather than requiring base64 uploads.
 */
export async function generateWithStraico(
  config: AIProviderConfig,
  request: GenerationRequest
): Promise<GenerationResult> {
  const message = buildMessage(request);

  const referenceImageUrls = request.referenceImageUrls?.length
    ? request.referenceImageUrls
    : request.referenceImageUrl
      ? [request.referenceImageUrl]
      : [];

  const body: Record<string, unknown> = {
    model: STRAICO_MODEL,
    message,
  };
  if (referenceImageUrls.length > 0) {
    body.file_urls = referenceImageUrls.slice(0, 4);
  }

  const payload = await callStraico(config.apiKey, body);
  const choice = payload.data?.completion?.choices?.[0];
  const text = choice?.message?.content ?? "";

  if (!text) {
    throw new Error("Straico returned an empty completion");
  }

  const usage = payload.data?.completion?.usage;
  const tokensUsed =
    usage?.total_tokens ??
    (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);

  const parsed = parseResponse(text);

  return {
    ...parsed,
    tokensUsed,
  };
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
    message: `=== SYSTEM ===\n${systemPrompt}\n=== USER ===\n${userPrompt}`,
  };
  if (options.maxOutputTokens) {
    body.max_tokens = options.maxOutputTokens;
  }
  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }
  const payload = await callStraico(apiKey, body);
  const choice = payload.data?.completion?.choices?.[0];
  const text = choice?.message?.content ?? "";
  const usage = payload.data?.completion?.usage;
  const tokensUsed =
    usage?.total_tokens ??
    (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);
  return { text, tokensUsed };
}

export const STRAICO_MODEL_ID = STRAICO_MODEL;
