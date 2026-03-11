import Replicate from "replicate";
import { put } from "@vercel/blob";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export type GenerateImageToVideoInput = {
  image: string;
  prompt: string;
  negativePrompt?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractVideoUrl(output: unknown): string | null {
  if (typeof output === "string" && output.startsWith("http")) {
    return output;
  }

  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === "string" && item.startsWith("http")) {
        return item;
      }

      if (
        item &&
        typeof item === "object" &&
        "url" in item &&
        typeof (item as { url?: unknown }).url === "string"
      ) {
        return (item as { url: string }).url;
      }
    }
  }

  if (
    output &&
    typeof output === "object" &&
    "url" in output &&
    typeof (output as { url?: unknown }).url === "string"
  ) {
    return (output as { url: string }).url;
  }

  return null;
}

async function createPredictionWithRetry(input: {
  image: string;
  prompt: string;
  negativePrompt?: string;
}) {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const prediction = await replicate.predictions.create({
        model: "wan-video/wan-2.2-i2v-fast",
        input: {
          image: input.image,
          prompt: input.prompt,
          negative_prompt:
            input.negativePrompt ??
            "blurry, distorted, low quality, flicker, broken anatomy, extra limbs, text, watermark, logo",
          num_frames: 81,
          fps: 16,
          resolution: "480p",
        },
      });

      return prediction;
    } catch (error: any) {
      const status = error?.response?.status;
      const retryAfterHeader = error?.response?.headers?.get?.("retry-after");
      const retryAfterSec = Number(retryAfterHeader);

      if (status === 429 && attempt < maxAttempts) {
        const waitMs =
          Number.isFinite(retryAfterSec) && retryAfterSec > 0
            ? retryAfterSec * 1000
            : attempt * 8000;

        console.warn(
          `Replicate rate limited (429). Waiting ${Math.round(
            waitMs / 1000
          )}s before retry ${attempt + 1}/${maxAttempts}...`
        );

        await sleep(waitMs);
        continue;
      }

      throw error;
    }
  }

  throw new Error("Replicate prediction creation failed after retries");
}

async function uploadRemoteVideoToBlob(remoteUrl: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing env: BLOB_READ_WRITE_TOKEN");
  }

  console.log("DOWNLOADING REPLICATE VIDEO:", remoteUrl);

  const response = await fetch(remoteUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download Replicate video. Status: ${response.status}`
    );
  }

  const contentType =
    response.headers.get("content-type")?.toLowerCase() || "video/mp4";

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!buffer.length) {
    throw new Error("Downloaded Replicate video is empty");
  }

  const extension = contentType.includes("webm") ? "webm" : "mp4";
  const fileName = `scene-videos/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;

  console.log("UPLOADING VIDEO TO BLOB:", fileName);

  const blob = await put(fileName, buffer, {
    access: "public",
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });

  console.log("BLOB VIDEO URL:", blob.url);

  return blob.url;
}

export async function generateImageToVideo(
  input: GenerateImageToVideoInput
): Promise<string> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("Missing env: REPLICATE_API_TOKEN");
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing env: BLOB_READ_WRITE_TOKEN");
  }

  if (!input.image?.trim()) {
    throw new Error("image is required");
  }

  if (!input.prompt?.trim()) {
    throw new Error("prompt is required");
  }

  console.log("REPLICATE VIDEO START");
  console.log("image:", input.image);
  console.log("prompt:", input.prompt);

  const prediction = await createPredictionWithRetry(input);

  console.log(
    "REPLICATE PREDICTION CREATED:",
    prediction.id,
    prediction.status
  );

  let current = prediction;
  const maxPollAttempts = 80;

  for (let i = 0; i < maxPollAttempts; i++) {
    if (current.status === "succeeded") {
      const replicateVideoUrl = extractVideoUrl(current.output);
      console.log("REPLICATE SUCCEEDED OUTPUT:", current.output);

      if (!replicateVideoUrl) {
        throw new Error("Prediction succeeded but no video URL found in output");
      }

      console.log("REPLICATE VIDEO URL:", replicateVideoUrl);

      const blobUrl = await uploadRemoteVideoToBlob(replicateVideoUrl);

      console.log("FINAL SCENE VIDEO URL:", blobUrl);

      return blobUrl;
    }

    if (current.status === "failed" || current.status === "canceled") {
      console.error("REPLICATE FAILED:", current.error);
      throw new Error(
        current.error ? String(current.error) : `Prediction ${current.status}`
      );
    }

    await sleep(3000);
    current = await replicate.predictions.get(prediction.id);
    console.log("REPLICATE POLL:", current.id, current.status);
  }

  throw new Error("Replicate prediction timed out");
}