import Anthropic from "@anthropic-ai/sdk";
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
 * Generate a Remotion preset using Anthropic Claude.
 */
export async function generateWithClaude(
  config: AIProviderConfig,
  request: GenerationRequest
): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey: config.apiKey });

  // Build the user content blocks
  const userContent: Anthropic.Messages.ContentBlockParam[] = [];

  // If a reference image URL is provided, include it
  if (request.referenceImageUrl) {
    try {
      const imageResponse = await fetch(request.referenceImageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString("base64");
      const mimeType = (imageResponse.headers.get("content-type") ||
        "image/png") as "image/png" | "image/jpeg" | "image/gif" | "image/webp";

      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType,
          data: base64,
        },
      });
    } catch (e) {
      // If image fetch fails, continue without it
      console.warn("Failed to fetch reference image:", e);
    }
  }

  // Build the text prompt
  let textPrompt = request.prompt;

  if (request.previousCode) {
    textPrompt += `\n\n═══ PREVIOUS CODE (iterate on this) ═══\n${request.previousCode}\n═══ END PREVIOUS CODE ═══\n\nPlease improve or modify the above code based on my new instructions.`;
  }

  userContent.push({ type: "text", text: textPrompt });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    temperature: 0.7,
    system: request.systemPrompt,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  // Extract text from response
  const textBlocks = response.content.filter(
    (block): block is Anthropic.Messages.TextBlock => block.type === "text"
  );
  const text = textBlocks.map((b) => b.text).join("");

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  const parsed = parseResponse(text);

  return {
    ...parsed,
    tokensUsed,
  };
}
