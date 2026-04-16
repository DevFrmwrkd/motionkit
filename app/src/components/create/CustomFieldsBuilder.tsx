"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export type CustomFieldType = "text" | "color" | "number" | "toggle";

export interface CustomField {
  name: string;
  type: CustomFieldType;
  default: string;
}

interface CustomFieldsBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  disabled?: boolean;
}

/**
 * Lets the user pre-declare the input schema they want the generated
 * preset to expose — separate from the prose "describe how it looks"
 * field. Serialized into a structured contract that gets appended to
 * the AI prompt, so the model is forced to wire those named props into
 * its component and declare them in `schema`.
 *
 * This decouples "what this thing looks like" (prose) from "what knobs
 * the user needs to tweak later" (structured), which was the key miss
 * of single-prompt generation.
 */
export function CustomFieldsBuilder({
  fields,
  onChange,
  disabled = false,
}: CustomFieldsBuilderProps) {
  const update = (index: number, patch: Partial<CustomField>) => {
    const next = fields.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const add = () => {
    onChange([...fields, { name: "", type: "text", default: "" }]);
  };

  const remove = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {fields.length === 0 && (
        <p className="text-[10px] text-muted-foreground leading-snug">
          Add fields the preset should expose (headline text, primary color,
          counter value, ...). The AI will wire these into its schema.
        </p>
      )}

      {fields.map((field, index) => (
        <div
          key={index}
          className="grid grid-cols-[1fr_90px_1fr_28px] gap-1.5 items-center"
        >
          <Input
            value={field.name}
            onChange={(e) => update(index, { name: e.target.value })}
            placeholder="fieldName"
            className="h-8 text-xs bg-accent border-border font-mono"
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
          />
          <Select
            value={field.type}
            onValueChange={(v) =>
              update(index, { type: v as CustomFieldType })
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs bg-accent border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text" className="text-xs">
                text
              </SelectItem>
              <SelectItem value="color" className="text-xs">
                color
              </SelectItem>
              <SelectItem value="number" className="text-xs">
                number
              </SelectItem>
              <SelectItem value="toggle" className="text-xs">
                toggle
              </SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={field.default}
            onChange={(e) => update(index, { default: e.target.value })}
            placeholder="default"
            className="h-8 text-xs bg-accent border-border"
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            disabled={disabled}
            className="h-8 w-8 text-muted-foreground hover:text-red-400"
            aria-label={`Remove field ${field.name || index + 1}`}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled || fields.length >= 12}
        className="w-full h-7 text-[11px]"
      >
        <Plus className="w-3 h-3 mr-1" />
        Add field
      </Button>
    </div>
  );
}

/**
 * Turn the user's structured field list into a deterministic block of
 * instructions the model can read as a contract. Fields with empty
 * names are dropped so a half-filled row doesn't poison the prompt.
 */
export function serializeCustomFields(fields: CustomField[]): string {
  const valid = fields.filter((f) => f.name.trim().length > 0);
  if (valid.length === 0) return "";

  const lines = valid.map((f) => {
    const safeName = f.name.trim().replace(/[^a-zA-Z0-9_]/g, "_");
    const defaultStr = f.default.trim() ? ` default=${JSON.stringify(f.default.trim())}` : "";
    return `- ${safeName} (${f.type})${defaultStr}`;
  });

  return [
    "",
    "REQUIRED INPUT SCHEMA:",
    "The generated component MUST accept these named props and expose them in its `schema` export with the listed types. Use the supplied defaults unless the prose prompt overrides them.",
    ...lines,
    "",
  ].join("\n");
}
