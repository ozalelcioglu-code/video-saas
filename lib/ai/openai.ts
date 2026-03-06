// lib/ai/openai.ts
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

export type Ratio = "square" | "vertical" | "horizontal";

export const StoryboardSchema = z.object({
  language: z.enum(["en", "tr"]).default("en"),
  title: z.string().min(3).max(80),
  brand_tone: z
    .object({
      keywords: z.array(z.string().min(2).max(24)).min(3).max(8),
      vibe: z.enum(["premium", "modern", "friendly", "bold", "minimal"]),
    })
    .strict(),
  script: z.object({
    hook: z.string().min(5).max(140),
    body: z.array(z.string().min(5).max(160)).min(2).max(6),
    cta: z.string().min(3).max(80),
  }),
  scenes: z
    .array(
      z
        .object({
          title: z.string().min(3).max(60),
          // Luma'ya gidecek “cinematic” video prompt
          prompt: z.string().min(10).max(420),
          // ekranda görünecek kısa yazı (opsiyonel)
          on_screen_text: z.string().min(0).max(60),
          // süre (saniye)
          duration_sec: z.number().int().min(2).max(10),
        })
        .strict()
    )
    .min(3)
    .max(7),
}).strict();

export type Storyboard = z.infer<typeof StoryboardSchema>;

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const openai = new OpenAI({
  apiKey: mustEnv("OPENAI_API_KEY"),
});

/**
 * Prompt -> storyboard (structured JSON)
 */
export async function generateStoryboard(input: {
  idea: string;          // user prompt
  brand: string;         // brand name
  ratio: Ratio;          // square/vertical/horizontal
  durationSec: number;   // total video length target
  language?: "en" | "tr";
}): Promise<Storyboard> {
  const idea = input.idea.trim();
  if (!idea) throw new Error("idea is required");

  const brand = (input.brand || "Brand").trim();
  const ratio = input.ratio ?? "square";
  const durationSec = Number.isFinite(input.durationSec) ? input.durationSec : 24;
  const language = input.language ?? "en";

  const system = [
    "You are an award-winning ad director and storyboard artist.",
    "Create a realistic, cinematic advertising storyboard as structured JSON.",
    "Keep it production-ready: short scenes, clear camera motion, lighting, lens style.",
    "Do NOT mention 'AI' or 'Luma' or 'Remotion' in the output.",
    "Return ONLY data that matches the provided JSON schema.",
  ].join(" ");

  const user = [
    `Brand: ${brand}`,
    `Video aspect ratio: ${ratio} (square=1:1, vertical=9:16, horizontal=16:9)`,
    `Target duration: ${durationSec} seconds total`,
    `Language: ${language}`,
    "",
    `Idea: ${idea}`,
    "",
    "Requirements:",
    "- 3 to 7 scenes.",
    "- Each scene duration 2-10 seconds.",
    "- Scene prompts must be cinematic and realistic: camera movement, lens, lighting, depth of field, film grain (subtle).",
    "- Use consistent style across scenes.",
    "- Include a strong hook and a clear CTA.",
  ].join("\n");

  // Structured Outputs via SDK parse + Zod schema
  const completion = await openai.chat.completions.parse({
    model: "gpt-4o-mini", // cost/perf iyi; Structured Outputs destekler :contentReference[oaicite:1]{index=1}
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: zodResponseFormat(StoryboardSchema, "storyboard"),
  });

  const parsed = completion.choices?.[0]?.message?.parsed;
  if (!parsed) throw new Error("No storyboard returned from OpenAI");

  return parsed;
}