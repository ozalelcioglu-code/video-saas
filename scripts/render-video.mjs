import path from "path";
import fs from "fs/promises";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const jobId = process.argv[2];
const inputJson = process.argv[3];

if (!jobId || !inputJson) {
  console.error("Usage: node scripts/render-video.mjs <jobId> '<json>'");
  process.exit(1);
}

const input = JSON.parse(inputJson);

const outDir = path.join(process.cwd(), "public", "renders");
await fs.mkdir(outDir, { recursive: true });

const entryPoint = path.join(process.cwd(), "remotion", "entry.ts");
const serveUrl = await bundle(entryPoint, () => undefined, {
  webpackOverride: (c) => c,
});

const comp = await selectComposition({
  serveUrl,
  id: "AdTemplate",
  inputProps: input,
});

const outPath = path.join(outDir, `${jobId}.mp4`);

await renderMedia({
  composition: comp,
  serveUrl,
  codec: "h264",
  outputLocation: outPath,
  inputProps: input,
});

console.log(JSON.stringify({ ok: true, url: `/renders/${jobId}.mp4` }));