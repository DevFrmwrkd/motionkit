"use client";

import { useCallback, useRef, useState } from "react";
import type {
  AssistantMetadata,
  ConversationContentPart,
  ConversationContextMessage,
  ConversationMessage,
  ConversationState,
  EditOperation,
  GenerationErrorType,
} from "@/lib/types";

function getImageIdentifiers(parts?: ConversationContentPart[]): string[] | undefined {
  const identifiers =
    parts
      ?.filter(
        (
          part
        ): part is Extract<ConversationContentPart, { type: "image" }> =>
          part.type === "image"
      )
      .map((part) => part.imageUrl ?? part.storageId)
      .filter((value): value is string => Boolean(value)) ?? [];

  return identifiers.length > 0 ? identifiers : undefined;
}

export function useConversationState() {
  const [state, setState] = useState<ConversationState>({
    messages: [],
    hasManualEdits: false,
    lastGenerationTimestamp: null,
    pendingMessage: undefined,
  });

  const lastAiCodeRef = useRef<string>("");

  const addUserMessage = useCallback(
    (content: string, contentParts?: ConversationContentPart[]) => {
      const normalizedParts =
        contentParts && contentParts.length > 0
          ? contentParts
          : [{ type: "text", text: content } satisfies ConversationContentPart];
      const message: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
        attachedImages: getImageIdentifiers(normalizedParts),
        contentParts: normalizedParts,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
      }));

      return message.id;
    },
    []
  );

  const addAssistantMessage = useCallback(
    (content: string, codeSnapshot: string, metadata?: AssistantMetadata) => {
      const message: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content,
        timestamp: Date.now(),
        codeSnapshot,
        metadata,
      };

      lastAiCodeRef.current = codeSnapshot;
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
        hasManualEdits: false,
        lastGenerationTimestamp: Date.now(),
      }));

      return message.id;
    },
    []
  );

  const addErrorMessage = useCallback(
    (
      content: string,
      errorType: GenerationErrorType,
      failedEdit?: EditOperation
    ) => {
      const message: ConversationMessage = {
        id: `error-${Date.now()}`,
        role: "error",
        content,
        timestamp: Date.now(),
        errorType,
        failedEdit,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
      }));

      return message.id;
    },
    []
  );

  const markManualEdit = useCallback((currentCode: string) => {
    if (lastAiCodeRef.current && currentCode !== lastAiCodeRef.current) {
      setState((prev) => ({
        ...prev,
        hasManualEdits: true,
      }));
    }
  }, []);

  const clearConversation = useCallback(() => {
    lastAiCodeRef.current = "";
    setState({
      messages: [],
      hasManualEdits: false,
      lastGenerationTimestamp: null,
      pendingMessage: undefined,
    });
  }, []);

  const setPendingMessage = useCallback((skills?: string[]) => {
    setState((prev) => ({
      ...prev,
      pendingMessage: {
        skills,
        startedAt: Date.now(),
        statusText:
          skills && skills.length > 0
            ? `Loading ${skills.join(" + ")} skill${skills.length > 1 ? "s" : ""}...`
            : "Loading motion-graphics skill...",
      },
    }));
  }, []);

  const clearPendingMessage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pendingMessage: undefined,
    }));
  }, []);

  const getFullContext = useCallback((): ConversationContextMessage[] => {
    return state.messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.role === "assistant" ? "[Generated Code]" : message.content,
        ...(message.role === "user" && message.contentParts
          ? {
              contentParts: message.contentParts,
              ...(message.attachedImages && message.attachedImages.length > 0
                ? { attachedImages: message.attachedImages }
                : {}),
            }
          : message.role === "user" &&
              message.attachedImages &&
              message.attachedImages.length > 0
            ? { attachedImages: message.attachedImages }
            : {}),
      }));
  }, [state.messages]);

  const getPreviouslyUsedSkills = useCallback((): string[] => {
    const allSkills = new Set<string>();
    for (const message of state.messages) {
      if (message.role === "assistant" && message.metadata?.skills) {
        for (const skill of message.metadata.skills) {
          allSkills.add(skill);
        }
      }
    }
    return Array.from(allSkills);
  }, [state.messages]);

  const getLastUserAttachedImages = useCallback((): string[] | undefined => {
    for (let index = state.messages.length - 1; index >= 0; index -= 1) {
      const message = state.messages[index];
      if (
        message.role === "user" &&
        message.attachedImages &&
        message.attachedImages.length > 0
      ) {
        return message.attachedImages;
      }
    }

    return undefined;
  }, [state.messages]);

  return {
    ...state,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    markManualEdit,
    clearConversation,
    getFullContext,
    getPreviouslyUsedSkills,
    getLastUserAttachedImages,
    setPendingMessage,
    clearPendingMessage,
    isFirstGeneration: state.messages.length === 0,
  };
}
