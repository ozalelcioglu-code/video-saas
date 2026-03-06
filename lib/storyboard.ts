import { z } from "zod";

export const RenderInputSchema = z.object({
  baseUrl: z.string().min(1),
  brand: z.string().min(1),
  slogan: z.string().min(1),
  text: z.string().min(1),
  durationSec: z.number().min(10).max(60),
  ratio: z.union([z.literal("square"), z.literal("vertical"), z.literal("horizontal")]),
  assets: z.object({
    logoUrl: z.string().nullable(),
    images: z.array(z.string()),
  }),
});

export type RenderInput = z.infer<typeof RenderInputSchema>;

export type Scene =
  | { type: "intro"; text: string; seconds: number }
  | { type: "value"; bullets: string[]; seconds: number }
  | { type: "cta"; brand: string; slogan: string; seconds: number };

export function buildStoryboard(input: RenderInput): Scene[] {
  const bullets = input.text
    .split(/[.\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const total = input.durationSec;
  const intro = Math.max(5, Math.floor(total * 0.25));
  const value = Math.max(9, Math.floor(total * 0.45));
  const cta = Math.max(6, total - intro - value);

  return [
    { type: "intro", text: "From Vision to Digital Reality", seconds: intro },
    {
      type: "value",
      bullets: bullets.length ? bullets : ["Modern Websites", "Custom Software", "Fast & Secure", "Scalable"],
      seconds: value,
    },
    { type: "cta", brand: input.brand, slogan: input.slogan, seconds: cta },
  ];
}