import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";

import { createJob, setJob } from "@/lib/jobs";
import { buildStoryboard } from "@/lib/storyboard";

export const runtime = "nodejs";

type Ratio = "square" | "vertical" | "horizontal";

function pickCompositionId(ratio: Ratio) {
  if (ratio === "vertical") return "AdVertical";
  if (ratio === "horizontal") return "AdHorizontal";
  return "AdSquare";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const ratio: Ratio = (body?.ratio ?? "square") as Ratio;
    const compositionId = pickCompositionId(ratio);

    const jobId = randomUUID();
    createJob(jobId);

    // Hemen queued dön
    setJob(jobId, { status: "queued", progress: 0, createdAt: Date.now() });

    // Render async devam etsin
    void (async () => {
      let cleanup: null | (() => Promise<void> | void) = null;

      try {
        setJob(jobId, { status: "bundling", progress: 1, createdAt: Date.now() });

        const outDir = path.join(process.cwd(), "public", "renders");
        await fs.mkdir(outDir, { recursive: true });

        // storyboard (client'tan gelmezse üret)
        const storyboard = body?.storyboard ?? buildStoryboard(body);

        const inputProps = {
          ...body,
          storyboard,
        };

        const entryPoint = path.join(process.cwd(), "remotion", "entry.ts");

        // bundle -> { serveUrl, cleanup } döner (remotion sürümüne göre string de dönebilir)
        const bundled = await bundle({
          entryPoint,
          // webpackOverride istersen burada eklenir
        });

        let serveUrl: string | undefined;

        if (typeof bundled === "string") {
          serveUrl = bundled;
        } else {
          // remotion/bundler yeni sürümler
          serveUrl = (bundled as any).serveUrl || (bundled as any).url;
          cleanup = (bundled as any).cleanup ?? null;
        }

        if (!serveUrl) throw new Error("serveUrl is undefined (bundle sonucu bozuk)");

        setJob(jobId, { status: "rendering", progress: 5, createdAt: Date.now() });

        // compositions listesi al ve doğru ID var mı kontrol et
        const comps = await getCompositions(serveUrl, { inputProps });
        const comp = comps.find((c) => c.id === compositionId);

        if (!comp) {
          const available = comps.map((c) => c.id).join(", ");
          throw new Error(
            `Composition '${compositionId}' bulunamadı. Mevcut: ${available}`
          );
        }

        const fileName = `${jobId}.mp4`;
        const outPath = path.join(outDir, fileName);
        const publicUrl = `/renders/${fileName}`;

        await renderMedia({
          serveUrl,
          composition: comp,
          codec: "h264",
          outputLocation: outPath,
          inputProps,
          onProgress: ({ progress }) => {
            const pct = Math.max(1, Math.min(99, Math.round(progress * 100)));
            setJob(jobId, {
              status: "rendering",
              progress: pct,
              createdAt: Date.now(),
            });
          },
        });

        setJob(jobId, {
          status: "done",
          progress: 100,
          url: publicUrl,
          createdAt: Date.now(),
        });
      } catch (err: any) {
        setJob(jobId, {
          status: "error",
          progress: 0,
          error: err?.message ?? "Render failed",
          createdAt: Date.now(),
        });
      } finally {
        try {
          if (cleanup) await cleanup();
        } catch {
          // ignore
        }
      }
    })();

    return NextResponse.json({ status: "ok", jobId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err?.message ?? "Bad request" },
      { status: 400 }
    );
  }
}