import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AIProviderConfig,
  GenerationRequest,
  GenerationResult,
} from "./types";

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
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  // Build the user prompt
  let userPrompt = request.prompt;

  if (request.previousCode) {
    userPrompt += `\n\n═══ PREVIOUS CODE (iterate on this) ═══\n${request.previousCode}\n═══ END PREVIOUS CODE ═══\n\nPlease improve or modify the above code based on my new instructions.`;
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: userPrompt },
  ];

  // If a reference image URL is provided, fetch and include it
  if (request.referenceImageUrl) {
    try {
      const imageResponse = await fetch(request.referenceImageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString("base64");
      const mimeType = imageResponse.headers.get("content-type") || "image/png";
      parts.push({
        inlineData: { mimeType, data: base64 },
      });
    } catch (e) {
      // If image fetch fails, continue without it
      console.warn("Failed to fetch reference image:", e);
    }
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    systemInstruction: { role: "model", parts: [{ text: request.systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });

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
