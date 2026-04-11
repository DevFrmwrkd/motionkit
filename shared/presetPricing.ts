export type PresetLicense =
  | "free"
  | "commercial-free"
  | "paid-personal"
  | "paid-commercial";

export type PresetPricingInput = {
  license?: PresetLicense;
  priceCents?: number;
  isPremium?: boolean;
  price?: number;
};

export type NormalizedPresetPricing = {
  license: PresetLicense;
  priceCents: number;
  isPremium: boolean;
  price: number;
};

export function normalizePresetPricing(
  preset: PresetPricingInput
): NormalizedPresetPricing {
  const legacyPriceCents =
    preset.priceCents ??
    (preset.price !== undefined ? Math.round(preset.price * 100) : 0);
  const license =
    preset.license ??
    (preset.isPremium === true || legacyPriceCents > 0
      ? "paid-personal"
      : "free");
  const priceCents =
    license === "paid-personal" || license === "paid-commercial"
      ? legacyPriceCents
      : 0;

  return {
    license,
    priceCents,
    isPremium:
      license === "paid-personal" || license === "paid-commercial",
    price: priceCents / 100,
  };
}
