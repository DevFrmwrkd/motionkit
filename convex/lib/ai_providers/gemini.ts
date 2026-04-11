import { GoogleGenerativeAI, type GenerativeModel, type GenerateContentRequest, type GenerateContentResult } from "@google/generative-ai";
import type {
  AIProviderConfig,
  GenerationRequest,
  GenerationResult,
} from "./types";

/**
 * The model we generate with. Older Gemini versions (2.5, 2.0) produce
 * noticeably worse Remotion code for our prompts, so we do NOT silently fall
 * back to them — we'd rather surface a friendly "overloaded, retry" error and
 * let the user hit Generate again than ship broken output.
 *
 * Override with the GEMINI_MODEL env var.
 */
const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-3-flash-preview";

const OVERLOAD_MESSAGE =
  "Google Gemini is currently overloaded and can't process free-tier requests right now. " +
  "Please wait a moment and hit Generate again. If this keeps happening, add your own Gemini API key in Settings → API Keys for higher priority.";

/**
 * Google's API returns errors as plain Error objects with the status code
 * embedded in the message. We pattern-match the handful that mean "try again
 * later" vs "this is a real failure and retrying won't help".
 */
function isGeminiOverloaded(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    /\b(503|429|500)\b/.test(msg) ||
    /overload|unavailable|rate.?limit|high demand/i.test(msg)
  );
}

/**
 * Call `generateContent` with in-place retries for transient overload errors.
 * On persistent overload, throws a user-friendly error message that the UI
 * can surface directly without exposing raw stack traces.
 *
 * We retry the SAME model rather than falling through to older versions —
 * users strongly prefer "try again in 30 seconds" over "silently got bad
 * output from gemini-2.x".
 */
export async function callGeminiWithFallback(
  genAI: GoogleGenerativeAI,
  buildRequest: (model: GenerativeModel) => GenerateContentRequest,
): Promise<{ result: GenerateContentResult; modelUsed: string }> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const backoffsMs = [0, 1200, 3000];
  let lastError: unknown;

  for (const delay of backoffsMs) {
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      const result = await model.generateContent(buildRequest(model));
      return { result, modelUsed: GEMINI_MODEL };
    } catch (err) {
      lastError = err;
      if (!isGeminiOverloaded(err)) {
        throw err;
      }
      console.warn(
        `[gemini] ${GEMINI_MODEL} overloaded, retrying...`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // All retries exhausted and the model is still overloaded. Surface the
  // friendly message to the caller; keep the original error chained on for
  // server-side debugging.
  const friendly = new Error(OVERLOAD_MESSAGE);
  (friendly as Error & { cause?: unknown }).cause = lastError;
  throw friendly;
}

/**
 * Parses the raw AI response to extract component, schema, and meta sections
 * using the ---COMPONENT---, ---SCHEMA---, ---META--- delimiters.
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
      "Failed to parse AI response: missing required sections. " +
        "Expected ---COMPONENT---, ---SCHEMA---, and ---META--- delimiters."
    );
  }

  const componentCode = componentMatch[1].trim();
  const schemaRaw = schemaMatch[1].trim();
  const metaRaw = metaMatch[1].trim();

  // Strip markdown code fences if the model wrapped them
  const stripFences = (s: string) =>
    s
      .replace(/^```(?:json|tsx|typescript|javascript)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

  const schema = stripFences(schemaRaw);
  const meta = stripFences(metaRaw);

  // Validate JSON
  try {
    JSON.parse(schema);
  } catch {
    throw new Error("Schema section is not valid JSON: " + schema.slice(0, 200));
  }
  try {
    JSON.parse(meta);
  } catch {
    throw new Error("Meta section is not valid JSON: " + meta.slice(0, 200));
  }

  return { componentCode: stripFences(componentCode), schema, meta };
}

/**
 * Generate a Remotion preset using Google Gemini.
 */
export async function generateWithGemini(
  config: AIProviderConfig,
  request: GenerationRequest
): Promise<GenerationResult> {
  const genAI = new GoogleGenerativeAI(config.apiKey);

  // Build the user prompt
  let userPrompt = request.prompt;

  if (request.previousCode) {
    userPrompt += `\n\n═══ PREVIOUS CODE (iterate on this) ═══\n${request.previousCode}\n═══ END PREVIOUS CODE ═══\n\nPlease improve or modify the above code based on my new instructions.`;
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: userPrompt },
  ];

  const referenceImageUrls = request.referenceImageUrls?.length
    ? request.referenceImageUrls
    : request.referenceImageUrl
      ? [request.referenceImageUrl]
      : [];

  for (const imageUrl of referenceImageUrls) {
    try {
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString("base64");
      const mimeType = imageResponse.headers.get("content-type") || "image/png";
      parts.push({
        inlineData: { mimeType, data: base64 },
      });
    } catch (e) {
      // If an image fetch fails, continue without it.
      console.warn("Failed to fetch reference image:", e);
    }
  }

  const { result } = await callGeminiWithFallback(genAI, () => ({
    contents: [{ role: "user", parts }],
    systemInstruction: { role: "model", parts: [{ text: request.systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  }));

  const response = result.response;
  const text = response.text();
  const tokensUsed =
    (response.usageMetadata?.promptTokenCount ?? 0) +
    (response.usageMetadata?.candidatesTokenCount ?? 0);

  const parsed = parseResponse(text);

  return {
    ...parsed,
    tokensUsed,
  };
}
