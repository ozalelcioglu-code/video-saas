import { NextResponse } from "next/server";
import { z } from "zod";
import { generateImageToVideo } from "../../../../lib/ai/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().min(3),
  negativePrompt: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const input = RequestSchema.parse(json);

    const useRealSceneVideo =
      String(process.env.USE_REAL_SCENE_VIDEO).toLowerCase() === "true";

    console.log("AI VIDEO REQUEST STARTED");
    console.log("USE_REAL_SCENE_VIDEO:", useRealSceneVideo);
    console.log("imageUrl:", input.imageUrl);
    console.log("prompt:", input.prompt);

    if (!useRealSceneVideo) {
      return NextResponse.json(
        {
          ok: false,
          code: "SCENE_VIDEO_DISABLED",
          error:
            "Real scene video generation is disabled. Set USE_REAL_SCENE_VIDEO=true in production environment variables.",
        },
        { status: 400 }
      );
    }

    const videoUrl = await generateImageToVideo({
      image: input.imageUrl,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
    });

    console.log("VIDEO URL RETURNED:", videoUrl);

    if (!videoUrl || typeof videoUrl !== "string") {
      return NextResponse.json(
        {
          ok: false,
          code: "SCENE_VIDEO_EMPTY",
          error: "No video URL returned from generateImageToVideo().",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        videoUrl,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Video generation failed:", err);

    if (err?.name === "ZodError") {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          error: "Invalid scene video request payload.",
          details: err.flatten?.() ?? null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "SCENE_VIDEO_FAILED",
        error: err?.message ?? "Video generation failed",
      },
      { status: 500 }
    );
  }
}