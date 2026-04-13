/**
 * OpenRouter provider.
 *
 * OpenRouter proxies hundreds of open and proprietary models behind a single
 * OpenAI-compatible API at https://openrouter.ai/api/v1/chat/completions.
 * Unlike Gemini/Claude where we hard-code the model id, the OpenRouter model
 * id is supplied by the user — they're expected to know which model they
 * want (e.g. "z-ai/glm-5.1", "deepseek/deepseek-chat-v3:free", etc.).
 *
 * We talk to it with plain fetch so we don't drag in an SDK just for this.
 */

import type { GenerationRequest, GenerationResult } from "./types";

export interface OpenRouterProviderConfig {
  apiKey: string;
  model: string;
}

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; type?: string; code?: number | string };
}

/**
 * Parses the raw response using the same delimiter format every provider
 * here shares: ---COMPONENT---, ---SCHEMA---, ---META---.
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
      "Failed to parse OpenRouter response: missing required sections. " +
        "Expected ---COMPONENT---, ---SCHEMA---, and ---META--- delimiters. " +
        "Raw response head: " +
        raw.slice(0, 400)
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
 * Fetches a reference image and returns an OpenAI-compatible image_url part
 * with an inline base64 data URI. OpenRouter's chat completions API follows
 * the OpenAI vision schema; non-vision models will ignore image parts.
 */
async function fetchImagePart(
  imageUrl: string
): Promise<{ type: "image_url"; image_url: { url: string } } | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const mimeType = res.headers.get("content-type") || "image/png";
    const base64 = Buffer.from(buffer).toString("base64");
    return {
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${base64}` },
    };
  } catch (e) {
    console.warn("[openrouter] reference image fetch failed:", e);
    return null;
  }
}

/**
 * Send a chat completion request to OpenRouter.
 */
export async function generateWithOpenRouter(
  config: OpenRouterProviderConfig,
  request: GenerationRequest
): Promise<GenerationResult> {
  if (!config.model || !config.model.trim()) {
    throw new Error(
      "OpenRouter model id is missing. Set it in Settings → API Keys."
    );
  }

  let textPrompt = request.prompt;
  if (request.previousCode) {
    textPrompt += `\n\n═══ PREVIOUS CODE (iterate on this) ═══\n${request.previousCode}\n═══ END PREVIOUS CODE ═══\n\nPlease improve or modify the above code based on my new instructions.`;
  }

  // Build the user message content. If there are no images, most models
  // accept a plain string, which keeps the payload simple and prevents
  // text-only models from tripping on the array form.
  const referenceImageUrls = request.referenceImageUrls?.length
    ? request.referenceImageUrls
    : request.referenceImageUrl
      ? [request.referenceImageUrl]
      : [];

  let userContent:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;

  if (referenceImageUrls.length === 0) {
    userContent = textPrompt;
  } else {
    const parts: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [{ type: "text", text: textPrompt }];
    for (const url of referenceImageUrls) {
      const part = await fetchImagePart(url);
      if (part) parts.push(part);
    }
    userContent = parts;
  }

  const body = {
    model: config.model.trim(),
    temperature: 0.7,
    max_tokens: 8192,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: userContent },
    ],
  };

  const res = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        // OpenRouter recommends these optional headers for attribution and
        // so requests show up under the right app in their dashboard.
        "HTTP-Referer": process.env.SITE_URL ?? "https://motionkit.app",
        "X-Title": "MotionKit",
      },
      body: JSON.stringify(body),
    }
  );

  const text = await res.text();
  let payload: OpenRouterChatResponse;
  try {
    payload = JSON.parse(text) as OpenRouterChatResponse;
  } catch {
    throw new Error(
      `OpenRouter returned non-JSON (${res.status}): ${text.slice(0, 300)}`
    );
  }

  if (!res.ok || payload.error) {
    const msg =
      payload.error?.message ??
      `OpenRouter request failed with status ${res.status}`;
    throw new Error(`OpenRouter error: ${msg}`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter returned an empty completion");
  }

  const parsed = parseResponse(content);
  const tokensUsed =
    payload.usage?.total_tokens ??
    (payload.usage?.prompt_tokens ?? 0) +
      (payload.usage?.completion_tokens ?? 0);

  return {
    ...parsed,
    tokensUsed,
  };
}
