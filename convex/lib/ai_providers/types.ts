/**
 * Shared types for AI generation providers.
 */

export interface AIProviderConfig {
  apiKey: string;
}

export interface GenerationRequest {
  prompt: string;
  systemPrompt: string;
  previousCode?: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
}

export interface GenerationResult {
  componentCode: string;
  schema: string;
  meta: string;
  tokensUsed: number;
}
