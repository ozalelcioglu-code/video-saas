import { NextResponse } from "next/server";
import path from "node:path";
import { access } from "node:fs/promises";
import {
  addBundleToSandbox,
  createSandbox,
  renderMediaOnVercel,
  uploadToVercelBlob,
} from "@remotion/vercel";
import { createVideoRecord } from "../../../lib/video-repository";
import { auth } from "../../../lib/auth";
import { COMP_NAME } from "../../../remotion/types/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ratio = "square" | "vertical" | "horizontal";
type Mode = "text" | "images" | "product";

type UnknownRecord = Record<string, unknown>;

type RenderScene = {
  id: string;
  title: string;
  prompt: string;
  imagePrompt?: string;
  onScreenText?: string;
  durationSec: number;
  imageUrl?: string;
  videoUrl?: string;
};

type RenderStoryboard = {
  title: string;
  ratio?: Ratio;
  brand_tone: {
    vibe: "premium" | "modern" | "friendly" | "bold" | "minimal";
    keywords: string[];
  };
  script: {
    hook: string;
    body: string[];
    cta: string;
    captions?: string[];
  };
  scenes: RenderScene[];
};

type RenderInputProps = {
  title: string;
  brand?: string;
  slogan?: string;
  text?: string;
  ratio?: Ratio;
  durationSec?: number;
  assets?: {
    logoUrl?: string | null;
    images?: string[];
  };
  storyboard?: RenderStoryboard;
};

const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const normalizeInputProps = (body: unknown): RenderInputProps => {
  const data = isRecord(body) ? body : {};
  const source = isRecord(data.inputProps) ? data.inputProps : data;
  const storyboard = isRecord(source.storyboard) ? source.storyboard : undefined;

  const ratio =
    source.ratio === "square" ||
    source.ratio === "vertical" ||
    source.ratio === "horizontal"
      ? source.ratio
      : storyboard?.ratio === "square" ||
          storyboard?.ratio === "vertical" ||
          storyboard?.ratio === "horizontal"
        ? (storyboard.ratio as Ratio)
        : undefined;

  const scenes: RenderScene[] = Array.isArray(storyboard?.scenes)
    ? storyboard.scenes
        .filter((scene): scene is UnknownRecord => isRecord(scene))
        .map((scene, index) => ({
          id:
            typeof scene.id === "string" && scene.id.trim()
              ? scene.id
              : `scene-${index + 1}`,
          title:
            typeof scene.title === "string" && scene.title.trim()
              ? scene.title
              : `Scene ${index + 1}`,
          prompt:
            typeof scene.prompt === "string" && scene.prompt.trim()
              ? scene.prompt
              : "",
          imagePrompt:
            typeof scene.imagePrompt === "string" && scene.imagePrompt.trim()
              ? scene.imagePrompt
              : typeof scene.image_prompt === "string" && scene.image_prompt.trim()
                ? scene.image_prompt
                : undefined,
          onScreenText:
            typeof scene.onScreenText === "string"
              ? scene.onScreenText
              : typeof scene.on_screen_text === "string"
                ? scene.on_screen_text
                : undefined,
          durationSec:
            typeof scene.durationSec === "number"
              ? scene.durationSec
              : typeof scene.duration_sec === "number"
                ? scene.duration_sec
                : 3,
          imageUrl:
            typeof scene.imageUrl === "string" && scene.imageUrl.trim()
              ? scene.imageUrl
              : undefined,
          videoUrl:
            typeof scene.videoUrl === "string" && scene.videoUrl.trim()
              ? scene.videoUrl
              : undefined,
        }))
    : [];

  return {
    title:
      typeof source.title === "string" && source.title.trim()
        ? source.title
        : typeof source.brand === "string" && source.brand.trim()
          ? source.brand
          : typeof storyboard?.title === "string" && storyboard.title.trim()
            ? storyboard.title
            : "Untitled Video",
    brand:
      typeof source.brand === "string" && source.brand.trim()
        ? source.brand
        : undefined,
    slogan:
      typeof source.slogan === "string" && source.slogan.trim()
        ? source.slogan
        : undefined,
    text:
      typeof source.text === "string" && source.text.trim()
        ? source.text
        : undefined,
    ratio,
    durationSec:
      typeof source.durationSec === "number" ? source.durationSec : undefined,
    assets: isRecord(source.assets)
      ? {
          logoUrl:
            typeof source.assets.logoUrl === "string"
              ? source.assets.logoUrl
              : null,
          images: Array.isArray(source.assets.images)
            ? source.assets.images.filter(
                (item): item is string => typeof item === "string"
              )
            : [],
        }
      : undefined,
    storyboard: storyboard
      ? {
          title:
            typeof storyboard.title === "string" && storyboard.title.trim()
              ? storyboard.title
              : "Untitled Storyboard",
          ratio,
          brand_tone: isRecord(storyboard.brand_tone)
            ? {
                vibe:
                  storyboard.brand_tone.vibe === "premium" ||
                  storyboard.brand_tone.vibe === "modern" ||
                  storyboard.brand_tone.vibe === "friendly" ||
                  storyboard.brand_tone.vibe === "bold" ||
                  storyboard.brand_tone.vibe === "minimal"
                    ? storyboard.brand_tone.vibe
                    : "modern",
                keywords: Array.isArray(storyboard.brand_tone.keywords)
                  ? storyboard.brand_tone.keywords.filter(
                      (item): item is string => typeof item === "string"
                    )
                  : [],
              }
            : {
                vibe: "modern",
                keywords: [],
              },
          script: isRecord(storyboard.script)
            ? {
                hook:
                  typeof storyboard.script.hook === "string"
                    ? storyboard.script.hook
                    : "",
                body: Array.isArray(storyboard.script.body)
                  ? storyboard.script.body.filter(
                      (item): item is string => typeof item === "string"
                    )
                  : [],
                cta:
                  typeof storyboard.script.cta === "string"
                    ? storyboard.script.cta
                    : "",
                captions: Array.isArray(storyboard.script.captions)
                  ? storyboard.script.captions.filter(
                      (item): item is string => typeof item === "string"
                    )
                  : [],
              }
            : {
                hook: "",
                body: [],
                cta: "",
                captions: [],
              },
          scenes,
        }
      : undefined,
  };
};

async function ensureBundleExists() {
  const bundleDir = path.join(process.cwd(), ".remotion");

  try {
    await access(bundleDir);
    return bundleDir;
  } catch {
    throw new Error(
      "Remotion production bundle not found. Make sure package.json build script generates '.remotion' before deploy."
    );
  }
}

export async function POST(req: Request) {
  let sandbox: Awaited<ReturnType<typeof createSandbox>> | null = null;

  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    const userId = session?.user?.id;
    const userEmail = session?.user?.email;
    const userName = session?.user?.name;

    if (!userId || !userEmail) {
      return NextResponse.json(
        {
          status: "error",
          code: "UNAUTHORIZED",
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const inputProps = normalizeInputProps(body);

    const {
      ensureUserProfile,
      getResolvedUserPlan,
    } = await import("../../../lib/user-profile-repository");

    await ensureUserProfile({
      userId,
      email: userEmail,
      fullName: userName ?? null,
    });

    const planInfo = await getResolvedUserPlan(userId);

    const requestedDuration =
      typeof body?.durationSec === "number"
        ? body.durationSec
        : typeof inputProps.durationSec === "number"
          ? inputProps.durationSec
          : 0;

    if (requestedDuration > planInfo.maxDurationSec) {
      return NextResponse.json(
        {
          status: "error",
          code: "PLAN_DURATION_LIMIT",
          error: `${planInfo.planLabel} plan allows maximum ${planInfo.maxDurationSec} seconds.`,
          upgradeRequired: true,
          plan: planInfo.plan,
          planLabel: planInfo.planLabel,
          maxDurationSec: planInfo.maxDurationSec,
          requestedDuration,
          usedThisMonth: planInfo.usedThisMonth,
          remainingCredits: planInfo.remainingCredits,
          monthlyVideoLimit: planInfo.monthlyVideoLimit,
        },
        { status: 403 }
      );
    }

    if (
      planInfo.monthlyVideoLimit !== null &&
      planInfo.usedThisMonth >= planInfo.monthlyVideoLimit
    ) {
      return NextResponse.json(
        {
          status: "error",
          code: "PLAN_MONTHLY_LIMIT",
          error: `${planInfo.planLabel} plan monthly video limit reached.`,
          upgradeRequired: true,
          plan: planInfo.plan,
          planLabel: planInfo.planLabel,
          maxDurationSec: planInfo.maxDurationSec,
          requestedDuration,
          usedThisMonth: planInfo.usedThisMonth,
          remainingCredits: planInfo.remainingCredits,
          monthlyVideoLimit: planInfo.monthlyVideoLimit,
        },
        { status: 403 }
      );
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      throw new Error("BLOB_READ_WRITE_TOKEN is missing");
    }

    const bundleDir = await ensureBundleExists();

    sandbox = await createSandbox();

    await addBundleToSandbox({
      sandbox,
      bundleDir: ".remotion",
    });

    const { sandboxFilePath } = await renderMediaOnVercel({
      sandbox,
      compositionId: COMP_NAME,
      inputProps,
      codec: "h264",
      outputFile: "/tmp/video.mp4",
    });

    const { url } = await uploadToVercelBlob({
      sandbox,
      sandboxFilePath,
      contentType: "video/mp4",
      blobToken,
      access: "public",
      blobPath: `renders/${Date.now()}.mp4`,
    });

    const mode: Mode =
      inputProps.storyboard
        ? "text"
        : inputProps.assets?.images?.length
          ? "images"
          : isRecord(body) &&
              typeof body.productUrl === "string" &&
              body.productUrl.trim()
            ? "product"
            : "text";

    await createVideoRecord({
      userId,
      title:
        inputProps.storyboard?.title ||
        inputProps.title ||
        inputProps.brand ||
        "Untitled Video",
      mode,
      videoUrl: url,
      durationSec: inputProps.durationSec ?? null,
      ratio: inputProps.ratio ?? null,
      prompt: inputProps.text ?? null,
      metadata: {
        brand: inputProps.brand ?? null,
        slogan: inputProps.slogan ?? null,
        storyboardTitle: inputProps.storyboard?.title ?? null,
        scenesCount: inputProps.storyboard?.scenes?.length ?? 0,
      },
    });

    return NextResponse.json(
      {
        status: "done",
        url,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("RENDER_ERROR:", err);

    return NextResponse.json(
      {
        status: "error",
        code: "RENDER_FAILED",
        error: err?.message ?? "Render failed",
      },
      { status: 500 }
    );
  } finally {
    if (sandbox) {
      await sandbox.stop();
    }
  }
}