"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HexColorPicker } from "react-colorful";
import type { PresetSchema, SchemaField } from "@/lib/types";

interface SchemaFormProps {
  schema: PresetSchema;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

// Groups we collapse by default to keep the right panel compact. Everything
// outside this set stays expanded.
const COLLAPSED_BY_DEFAULT = new Set(["Style", "Advanced", "Timing", "Debug"]);

/**
 * Generates a form from a preset's schema definition.
 * Each field type maps to the appropriate UI control.
 * Fields are grouped by the `group` property and each group is a
 * collapsible section so tall schemas don't swallow the panel.
 */
export function SchemaForm({ schema, values, onChange }: SchemaFormProps) {
  // Group fields by their group property, preserving insertion order.
  const groups = useMemo(() => {
    const map = new Map<string, [string, SchemaField][]>();
    for (const [key, field] of Object.entries(schema)) {
      const group = field.group ?? "General";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push([key, field]);
    }
    return map;
  }, [schema]);

  return (
    <div className="space-y-2">
      {Array.from(groups.entries()).map(([groupName, fields]) => (
        <CollapsibleGroup
          key={groupName}
          name={groupName}
          defaultOpen={!COLLAPSED_BY_DEFAULT.has(groupName)}
        >
          <div className="space-y-3 pt-1">
            {fields.map(([key, field]) => (
              <FieldRenderer
                key={key}
                fieldKey={key}
                field={field}
                value={values[key]}
                onChange={onChange}
              />
            ))}
          </div>
        </CollapsibleGroup>
      ))}
    </div>
  );
}

function CollapsibleGroup({
  name,
  defaultOpen,
  children,
}: {
  name: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        <span>{name}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && children}
    </div>
  );
}

/**
 * True when a text field looks like structured data (JSON array/object or
 * contains explicit newlines) and should render as a textarea instead of a
 * one-line input. AI-generated `data` / `items` fields are the main target.
 */
function isMultilineText(fieldKey: string, field: SchemaField, value: unknown): boolean {
  const candidate =
    (typeof value === "string" && value) ||
    (typeof field.default === "string" && field.default) ||
    "";
  if (!candidate) {
    // Fall back to name-based heuristic so an empty field still gets a
    // textarea when its key hints at structured content.
    return /json|data|items|rows|entries|config/i.test(fieldKey);
  }
  if (candidate.includes("\n")) return true;
  const trimmed = candidate.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return true;
  return candidate.length > 80;
}

function formatMaybeJson(value: string): string {
  const trimmed = value.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return value;
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return value;
  }
}

function FieldRenderer({
  fieldKey,
  field,
  value,
  onChange,
}: {
  fieldKey: string;
  field: SchemaField;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  const label = field.label ?? fieldKey;

  switch (field.type) {
    case "text": {
      const multiline = isMultilineText(fieldKey, field, value);
      if (multiline) {
        const displayValue =
          typeof value === "string"
            ? formatMaybeJson(value)
            : ((field.default as string) ?? "");
        return (
          <div className="space-y-1">
            <Label htmlFor={fieldKey} className="text-[11px] font-medium leading-none">
              {label}
            </Label>
            <Textarea
              id={fieldKey}
              value={displayValue}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              className="min-h-[80px] max-h-[200px] font-mono text-[10px] leading-snug resize-y bg-accent border-border p-2"
              spellCheck={false}
            />
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <Label htmlFor={fieldKey} className="text-[11px] font-medium leading-none">
            {label}
          </Label>
          <Input
            id={fieldKey}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            className="h-8 text-xs px-2"
          />
        </div>
      );
    }

    case "color":
      return (
        <div className="space-y-1">
          <Label className="text-[11px] font-medium leading-none">{label}</Label>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded border border-zinc-700 shrink-0"
              style={{ backgroundColor: (value as string) ?? "#000" }}
            />
            <Input
              value={(value as string) ?? ""}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              className="font-mono text-xs h-8 px-2"
            />
          </div>
          <HexColorPicker
            color={(value as string) ?? "#000"}
            onChange={(c) => onChange(fieldKey, c)}
            style={{ width: "100%", height: "120px" }}
          />
        </div>
      );

    case "number":
    case "duration":
      return (
        <div className="space-y-1">
          <div className="flex justify-between">
            <Label className="text-[11px] font-medium leading-none">{label}</Label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {String(value ?? field.default)}
              {field.type === "duration" ? "s" : ""}
            </span>
          </div>
          <Slider
            value={[Number(value ?? field.default)]}
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            onValueChange={(val) => onChange(fieldKey, Array.isArray(val) ? val[0] : val)}
            className="py-1"
          />
        </div>
      );

    case "toggle":
      return (
        <div className="flex items-center justify-between py-0.5">
          <Label className="text-[11px] font-medium leading-none">{label}</Label>
          <Switch
            checked={Boolean(value ?? field.default)}
            onCheckedChange={(v) => onChange(fieldKey, v)}
            className="scale-90"
          />
        </div>
      );

    case "select":
    case "font":
      return (
        <div className="space-y-1">
          <Label className="text-[11px] font-medium leading-none">{label}</Label>
          <Select
            value={(value as string) ?? ""}
            onValueChange={(v) => onChange(fieldKey, v)}
          >
            <SelectTrigger className="h-8 text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "image":
      return (
        <div className="space-y-1">
          <Label className="text-[11px] font-medium leading-none">{label}</Label>
          <Input
            type="url"
            placeholder="Image URL"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            className="h-8 text-xs px-2"
          />
        </div>
      );

    default:
      return null;
  }
}
