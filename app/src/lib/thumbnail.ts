/**
 * Thumbnail generation for marketplace presets.
 *
 * Renders a branded preview image to a canvas using the preset name,
 * description, and category. Returns a Blob ready to upload.
 *
 * This is a pragmatic MVP — a full MP4 video preview requires a dynamic
 * Remotion bundler that can render AI-generated code, which isn't wired up
 * in the Lambda pipeline yet. A static branded thumbnail is enough to make
 * marketplace cards visually distinct in the meantime.
 */

const CATEGORY_PALETTE: Record<
  string,
  { from: string; to: string; accent: string }
> = {
  intro: { from: "#1e3a8a", to: "#0a0a0a", accent: "#60a5fa" },
  title: { from: "#4c1d95", to: "#0a0a0a", accent: "#c4b5fd" },
  "lower-third": { from: "#134e4a", to: "#0a0a0a", accent: "#5eead4" },
  cta: { from: "#7c2d12", to: "#0a0a0a", accent: "#fdba74" },
  transition: { from: "#831843", to: "#0a0a0a", accent: "#f9a8d4" },
  outro: { from: "#312e81", to: "#0a0a0a", accent: "#a5b4fc" },
  full: { from: "#78350f", to: "#0a0a0a", accent: "#fcd34d" },
  chart: { from: "#064e3b", to: "#0a0a0a", accent: "#6ee7b7" },
  map: { from: "#164e63", to: "#0a0a0a", accent: "#67e8f9" },
  social: { from: "#881337", to: "#0a0a0a", accent: "#fda4af" },
};

export async function generatePresetThumbnail({
  name,
  description,
  category,
  width = 1280,
  height = 720,
}: {
  name: string;
  description?: string;
  category: string;
  width?: number;
  height?: number;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to get canvas context");

  const palette = CATEGORY_PALETTE[category] ?? {
    from: "#27272a",
    to: "#0a0a0a",
    accent: "#f59e0b",
  };

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, palette.from);
  gradient.addColorStop(1, palette.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Large translucent category watermark (bottom right)
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.floor(height * 0.35)}px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(category.toUpperCase(), width - 40, height - 20);
  ctx.restore();

  // Accent bar
  ctx.fillStyle = palette.accent;
  ctx.fillRect(80, height / 2 - 4, 96, 8);

  // Title
  ctx.fillStyle = "#fafafa";
  ctx.font = `bold 72px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const maxTitleWidth = width - 160;
  const titleLines = wrapText(ctx, name, maxTitleWidth);
  let titleY = height / 2 + 48;
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, 80, titleY);
    titleY += 84;
  }

  // Description
  if (description) {
    ctx.fillStyle = "rgba(250, 250, 250, 0.6)";
    ctx.font = `400 28px system-ui, sans-serif`;
    const descLines = wrapText(ctx, description, maxTitleWidth);
    let descY = titleY + 10;
    for (const line of descLines.slice(0, 2)) {
      ctx.fillText(line, 80, descY);
      descY += 38;
    }
  }

  // MotionKit badge (top left)
  ctx.fillStyle = "rgba(250, 250, 250, 0.5)";
  ctx.font = `600 24px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("MotionKit", 80, 80);

  // Category label (top right)
  ctx.fillStyle = palette.accent;
  ctx.font = `600 22px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(category.toUpperCase(), width - 80, 80);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to generate thumbnail"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.88
    );
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
