"use client";

import { useCallback, useEffect, useRef } from "react";
import type {
  EditOperation,
  ErrorCorrectionContext,
  GenerationErrorType,
} from "@/lib/types";

interface AutoCorrectionConfig {
  maxAttempts: number;
  compilationError: string | null;
  generationError: {
    message: string;
    type: GenerationErrorType;
    failedEdit?: EditOperation;
  } | null;
  isStreaming: boolean;
  isCompiling: boolean;
  hasGeneratedOnce: boolean;
  code: string;
  errorCorrection: ErrorCorrectionContext | null;
  onTriggerCorrection: (
    prompt: string,
    errorContext: ErrorCorrectionContext
  ) => void;
  onAddErrorMessage: (
    message: string,
    type: GenerationErrorType,
    failedEdit?: EditOperation
  ) => void;
  onClearGenerationError: () => void;
  onClearErrorCorrection: () => void;
}

export function useAutoCorrection({
  maxAttempts,
  compilationError,
  generationError,
  isStreaming,
  isCompiling,
  hasGeneratedOnce,
  code,
  errorCorrection,
  onTriggerCorrection,
  onAddErrorMessage,
  onClearGenerationError,
  onClearErrorCorrection,
}: AutoCorrectionConfig) {
  const lastChangeSourceRef = useRef<"ai" | "user">("ai");

  const markAsAiGenerated = useCallback(() => {
    lastChangeSourceRef.current = "ai";
  }, []);

  const markAsUserEdited = useCallback(() => {
    lastChangeSourceRef.current = "user";
  }, []);

  const shouldAutoCorrect = useCallback(() => {
    return (
      hasGeneratedOnce &&
      !isStreaming &&
      lastChangeSourceRef.current === "ai" &&
      (errorCorrection?.attemptNumber ?? 0) < maxAttempts
    );
  }, [errorCorrection, hasGeneratedOnce, isStreaming, maxAttempts]);

  useEffect(() => {
    if (
      compilationError &&
      !isCompiling &&
      !generationError &&
      code.trim() &&
      shouldAutoCorrect()
    ) {
      const nextAttempt = (errorCorrection?.attemptNumber ?? 0) + 1;

      onAddErrorMessage(`Compilation error: ${compilationError}`, "validation");
      onTriggerCorrection("Fix the compilation error", {
        error: compilationError,
        attemptNumber: nextAttempt,
        maxAttempts,
      });
    }

    if (!compilationError && !isCompiling && errorCorrection) {
      onClearErrorCorrection();
    }
  }, [
    code,
    compilationError,
    errorCorrection,
    generationError,
    isCompiling,
    maxAttempts,
    onAddErrorMessage,
    onClearErrorCorrection,
    onTriggerCorrection,
    shouldAutoCorrect,
  ]);

  useEffect(() => {
    if (generationError && shouldAutoCorrect()) {
      const nextAttempt = (errorCorrection?.attemptNumber ?? 0) + 1;

      onClearGenerationError();
      onTriggerCorrection("Retry the previous request", {
        error: generationError.message,
        attemptNumber: nextAttempt,
        maxAttempts,
        failedEdit: generationError.failedEdit,
      });
    }
  }, [
    errorCorrection,
    generationError,
    maxAttempts,
    onClearGenerationError,
    onTriggerCorrection,
    shouldAutoCorrect,
  ]);

  return {
    markAsAiGenerated,
    markAsUserEdited,
  };
}
