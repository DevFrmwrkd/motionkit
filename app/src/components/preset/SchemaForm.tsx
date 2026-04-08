"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { HexColorPicker } from "react-colorful";
import type { PresetSchema, SchemaField } from "@/lib/types";

interface SchemaFormProps {
  schema: PresetSchema;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

/**
 * Generates a form from a preset's schema definition.
 * Each field type maps to the appropriate UI control.
 * Fields are grouped by the `group` property.
 */
export function SchemaForm({ schema, values, onChange }: SchemaFormProps) {
  // Group fields by their group property
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
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([groupName, fields]) => (
        <div key={groupName}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            {groupName}
          </h3>
          <div className="space-y-4">
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
          <Separator className="mt-6" />
        </div>
      ))}
    </div>
  );
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
    case "text":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={fieldKey}>{label}</Label>
          <Input
            id={fieldKey}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
          />
        </div>
      );

    case "color":
      return (
        <div className="space-y-1.5">
          <Label>{label}</Label>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded border border-zinc-700 shrink-0"
              style={{ backgroundColor: (value as string) ?? "#000" }}
            />
            <Input
              value={(value as string) ?? ""}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <HexColorPicker
            color={(value as string) ?? "#000"}
            onChange={(c) => onChange(fieldKey, c)}
            style={{ width: "100%" }}
          />
        </div>
      );

    case "number":
    case "duration":
      return (
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label>{label}</Label>
            <span className="text-xs text-zinc-400 tabular-nums">
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
          />
        </div>
      );

    case "toggle":
      return (
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <Switch
            checked={Boolean(value ?? field.default)}
            onCheckedChange={(v) => onChange(fieldKey, v)}
          />
        </div>
      );

    case "select":
    case "font":
      return (
        <div className="space-y-1.5">
          <Label>{label}</Label>
          <Select
            value={(value as string) ?? ""}
            onValueChange={(v) => onChange(fieldKey, v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "image":
      return (
        <div className="space-y-1.5">
          <Label>{label}</Label>
          <Input
            type="url"
            placeholder="Image URL"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
          />
        </div>
      );

    default:
      return null;
  }
}
