/**
 * Project-level brand kit and the mapping rules that decide how it
 * overrides preset inputs when a preset is opened inside a project's
 * scope.
 *
 * The kit is deliberately flat and opinionated: every brand has a
 * handful of colors, a typeface pair, a logo, and a display name.
 * Presets expose color/text/font fields under well-known names
 * (`primaryColor`, `accentColor`, `headingFont`, `logoUrl`, etc.), and
 * we auto-fill any field whose name matches. Fields the preset doesn't
 * expose are ignored; tokens the user hasn't set on the kit fall
 * through to the preset's own defaults.
 *
 * This file lives under `shared/` because both the client workstation
 * and any future server-side render dispatcher need to agree on which
 * tokens map to which preset inputs.
 */

export type BrandKit = {
  brandName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontHeading?: string;
  fontBody?: string;
  logoUrl?: string;
};

/**
 * Synonyms a preset author may use for each brand token. Kept
 * case-insensitive via `.toLowerCase()` comparison at apply time.
 * Expand conservatively — a collision with a non-brand field would
 * silently overwrite unrelated input state.
 */
const BRAND_FIELD_ALIASES: Record<keyof BrandKit, string[]> = {
  brandName: ["brandname", "brand", "companyname", "company"],
  primaryColor: ["primarycolor", "primary", "brandcolor", "color"],
  secondaryColor: ["secondarycolor", "secondary"],
  accentColor: ["accentcolor", "accent", "highlight", "highlightcolor"],
  backgroundColor: ["backgroundcolor", "background", "bgcolor", "bg"],
  textColor: ["textcolor", "text", "foreground", "foregroundcolor"],
  fontHeading: ["fontheading", "headingfont", "headlinefont", "titlefont"],
  fontBody: ["fontbody", "bodyfont", "font"],
  logoUrl: ["logourl", "logo", "logoimage", "brandlogo"],
};

/**
 * Apply a brand kit over a preset's current input values.
 *
 * Strategy: for each schema field, check whether its key matches any
 * alias of a brand token the kit has set. If so, override the value;
 * otherwise keep what the caller already had. User-edited values in
 * `currentValues` are preserved for fields the kit doesn't touch.
 */
export function applyBrandKitToValues(
  schema: Record<string, { type?: string }> | null | undefined,
  brandKit: BrandKit | null | undefined,
  currentValues: Record<string, unknown>
): Record<string, unknown> {
  if (!schema || !brandKit) return currentValues;

  const result = { ...currentValues };
  const keys = Object.keys(schema);

  for (const [token, value] of Object.entries(brandKit) as [
    keyof BrandKit,
    string | undefined
  ][]) {
    if (!value) continue;
    const aliases = BRAND_FIELD_ALIASES[token];
    for (const fieldKey of keys) {
      if (aliases.includes(fieldKey.toLowerCase())) {
        result[fieldKey] = value;
      }
    }
  }

  return result;
}

export const BRAND_KIT_TOKEN_LABELS: Record<keyof BrandKit, string> = {
  brandName: "Brand name",
  primaryColor: "Primary color",
  secondaryColor: "Secondary color",
  accentColor: "Accent color",
  backgroundColor: "Background color",
  textColor: "Text color",
  fontHeading: "Heading font",
  fontBody: "Body font",
  logoUrl: "Logo URL",
};

export const BRAND_KIT_COLOR_TOKENS: (keyof BrandKit)[] = [
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
];
