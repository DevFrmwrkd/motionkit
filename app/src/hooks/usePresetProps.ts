"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { PresetSchema } from "@/lib/types";

/**
 * Manages the current prop values for a preset based on its schema.
 * Initializes with defaults from schema, provides update functions.
 */
export function usePresetProps(schema: PresetSchema) {
  const defaults = useMemo(() => {
    const d: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(schema)) {
      d[key] = field.default;
    }
    return d;
  }, [schema]);

  const [props, setProps] = useState<Record<string, unknown>>(defaults);

  useEffect(() => {
    setProps(defaults);
  }, [defaults]);

  const updateProp = useCallback((key: string, value: unknown) => {
    setProps((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetProps = useCallback(() => {
    setProps(defaults);
  }, [defaults]);

  const resetProp = useCallback(
    (key: string) => {
      setProps((prev) => ({ ...prev, [key]: defaults[key] }));
    },
    [defaults]
  );

  return { props, updateProp, resetProps, resetProp, defaults };
}
