"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Plus, Trash2, Code2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

type JsonRow = Record<string, unknown>;

/**
 * Parse a text value into an array of plain-object rows, or return null if
 * the value isn't a homogeneous array-of-objects shape we can render as a
 * table-like no-code editor.
 */
function parseRowsArray(value: string): JsonRow[] | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const isRow = (v: unknown): v is JsonRow =>
    !!v && typeof v === "object" && !Array.isArray(v);
  if (!parsed.every(isRow)) return null;
  return parsed as JsonRow[];
}

/** Collect column keys in insertion order across all rows. */
function collectColumns(rows: JsonRow[]): string[] {
  const cols: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        cols.push(key);
      }
    }
  }
  return cols;
}

/** Infer the input type for a column based on the first row's value. */
function inferColumnType(rows: JsonRow[], col: string): "number" | "text" | "color" {
  for (const row of rows) {
    const v = row[col];
    if (v === undefined || v === null) continue;
    if (typeof v === "number") return "number";
    if (typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return "color";
    return "text";
  }
  return "text";
}

/**
 * No-code row editor for JSON array values. Each row is a collapsible card
 * with one input per column. Values are coerced back to numbers when the
 * inferred column type is numeric so the serialized JSON stays clean.
 */
function JsonRowsEditor({
  rows,
  onRowsChange,
  onSwitchToRaw,
}: {
  rows: JsonRow[];
  onRowsChange: (rows: JsonRow[]) => void;
  onSwitchToRaw: () => void;
}) {
  const columns = useMemo(() => collectColumns(rows), [rows]);
  const columnTypes = useMemo(() => {
    const map: Record<string, "number" | "text" | "color"> = {};
    for (const c of columns) map[c] = inferColumnType(rows, c);
    return map;
  }, [rows, columns]);

  const updateCell = (idx: number, col: string, raw: string) => {
    const next = rows.map((r, i) => {
      if (i !== idx) return r;
      const copy = { ...r };
      if (columnTypes[col] === "number") {
        const n = raw === "" ? 0 : Number(raw);
        copy[col] = Number.isFinite(n) ? n : raw;
      } else {
        copy[col] = raw;
      }
      return copy;
    });
    onRowsChange(next);
  };

  const addRow = () => {
    const template: JsonRow = {};
    for (const c of columns) {
      template[c] = columnTypes[c] === "number" ? 0 : "";
    }
    onRowsChange([...rows, template]);
  };

  const removeRow = (idx: number) => {
    onRowsChange(rows.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">
          {rows.length} row{rows.length === 1 ? "" : "s"} · {columns.length} field
          {columns.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSwitchToRaw}
            className="h-6 px-1.5 text-[10px] gap-1"
            title="Edit raw JSON"
          >
            <Code2 className="w-3 h-3" />
            JSON
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addRow}
            className="h-6 px-1.5 text-[10px] gap-1"
          >
            <Plus className="w-3 h-3" />
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {rows.map((row, idx) => (
          <RowCard
            key={idx}
            index={idx}
            row={row}
            columns={columns}
            columnTypes={columnTypes}
            onChangeCell={(col, val) => updateCell(idx, col, val)}
            onRemove={() => removeRow(idx)}
          />
        ))}
      </div>
    </div>
  );
}

function RowCard({
  index,
  row,
  columns,
  columnTypes,
  onChangeCell,
  onRemove,
}: {
  index: number;
  row: JsonRow;
  columns: string[];
  columnTypes: Record<string, "number" | "text" | "color">;
  onChangeCell: (col: string, val: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(index < 3);

  // Short preview: first two columns' values joined.
  const preview = columns
    .slice(0, 2)
    .map((c) => String(row[c] ?? ""))
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-md border border-border/60 bg-accent/40">
      <div className="flex items-center gap-1 px-2 py-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-1.5 text-[11px] font-medium text-left hover:text-foreground text-muted-foreground"
          aria-expanded={open}
        >
          <ChevronRight
            className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}
          />
          <span className="tabular-nums">#{index + 1}</span>
          {preview && (
            <span className="text-foreground/80 truncate">{preview}</span>
          )}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove row"
          aria-label={`Remove row ${index + 1}`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {open && (
        <div className="px-2 pb-2 pt-0.5 space-y-1.5 border-t border-border/50">
          {columns.map((col) => {
            const type = columnTypes[col];
            const raw = row[col];
            const stringVal = raw === undefined || raw === null ? "" : String(raw);
            return (
              <div key={col} className="space-y-0.5">
                <Label className="text-[10px] font-medium leading-none text-muted-foreground">
                  {col}
                </Label>
                {type === "color" ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={stringVal || "#000000"}
                      onChange={(e) => onChangeCell(col, e.target.value)}
                      className="h-7 w-7 rounded border border-border bg-transparent p-0 cursor-pointer"
                    />
                    <Input
                      value={stringVal}
                      onChange={(e) => onChangeCell(col, e.target.value)}
                      className="h-7 text-[11px] px-2 font-mono"
                    />
                  </div>
                ) : (
                  <Input
                    type={type === "number" ? "number" : "text"}
                    value={stringVal}
                    onChange={(e) => onChangeCell(col, e.target.value)}
                    className="h-7 text-[11px] px-2"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Renders a multiline text/JSON field. When the value parses as an array of
 * objects, defaults to a no-code row editor with a JSON fallback toggle.
 * The whole field is wrapped in a collapsible header so tall data tables
 * don't dominate the panel.
 */
function JsonOrTextField({
  fieldKey,
  label,
  value,
  onChange,
}: {
  fieldKey: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const rows = useMemo(() => parseRowsArray(value), [value]);
  const canUseRows = rows !== null;
  const [mode, setMode] = useState<"rows" | "raw">(canUseRows ? "rows" : "raw");
  const [open, setOpen] = useState(true);

  // If value becomes non-parseable while in rows mode, drop back to raw.
  const effectiveMode = canUseRows ? mode : "raw";

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1 text-left"
        aria-expanded={open}
      >
        <ChevronRight
          className={`w-3 h-3 text-muted-foreground transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
        <Label
          htmlFor={fieldKey}
          className="text-[11px] font-medium leading-none cursor-pointer"
        >
          {label}
        </Label>
        {canUseRows && (
          <span className="ml-auto inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            <Table2 className="w-2.5 h-2.5" />
            table
          </span>
        )}
      </button>

      {open && (
        <>
          {effectiveMode === "rows" && rows ? (
            <JsonRowsEditor
              rows={rows}
              onRowsChange={(next) => onChange(JSON.stringify(next, null, 2))}
              onSwitchToRaw={() => setMode("raw")}
            />
          ) : (
            <div className="space-y-1">
              {canUseRows && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode("rows")}
                    className="h-6 px-1.5 text-[10px] gap-1"
                    title="Switch to table view"
                  >
                    <Table2 className="w-3 h-3" />
                    Table
                  </Button>
                </div>
              )}
              <Textarea
                id={fieldKey}
                value={formatMaybeJson(value)}
                onChange={(e) => onChange(e.target.value)}
                className="min-h-[80px] max-h-[200px] font-mono text-[10px] leading-snug resize-y bg-accent border-border p-2"
                spellCheck={false}
              />
            </div>
          )}
        </>
      )}
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
    case "text": {
      const multiline = isMultilineText(fieldKey, field, value);
      if (multiline) {
        const sourceString =
          typeof value === "string"
            ? value
            : ((field.default as string) ?? "");
        return (
          <JsonOrTextField
            fieldKey={fieldKey}
            label={label}
            value={sourceString}
            onChange={(v) => onChange(fieldKey, v)}
          />
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
