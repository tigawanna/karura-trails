import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE_SVG = path.join(ROOT, "expo-icons", "icon.svg");
const OUTPUT_DIR = path.join(ROOT, "expo-icons");
const BRAND_BACKGROUND = "#033102";

type IconSpec = {
  fileName: string;
  size: number;
  background?: string;
  paddingRatio?: number;
};

const ICON_SPECS: IconSpec[] = [
  { fileName: "icon.png", size: 1024, background: BRAND_BACKGROUND },
  { fileName: "adaptive-icon.png", size: 1024, background: BRAND_BACKGROUND, paddingRatio: 0.18 },
  { fileName: "splash-icon.png", size: 642, background: BRAND_BACKGROUND, paddingRatio: 0.08 },
  { fileName: "favicon.png", size: 48, background: BRAND_BACKGROUND, paddingRatio: 0.1 },
];

async function renderIcon({
  fileName,
  size,
  background,
  paddingRatio = 0,
}: IconSpec): Promise<void> {
  const innerSize = Math.round(size * (1 - paddingRatio * 2));
  const offset = Math.round((size - innerSize) / 2);
  const foreground = await sharp(SOURCE_SVG)
    .resize(innerSize, innerSize, { fit: "contain" })
    .png()
    .toBuffer();

  const layers: sharp.OverlayOptions[] = [{ input: foreground, top: offset, left: offset }];
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? "#00000000",
    },
  });

  await canvas.composite(layers).png().toFile(path.join(OUTPUT_DIR, fileName));
}

async function main(): Promise<void> {
  if (!fs.existsSync(SOURCE_SVG)) {
    console.error(`[generate-expo-icons] Missing source SVG: ${SOURCE_SVG}`);
    process.exit(1);
  }

  for (const spec of ICON_SPECS) {
    await renderIcon(spec);
    console.log(`[generate-expo-icons] Wrote ${spec.fileName}`);
  }
}

main().catch((error: unknown) => {
  console.error("[generate-expo-icons] Failed:", error);
  process.exit(1);
});
