import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type Scene =
  | { type: "intro"; text: string; seconds: number }
  | { type: "value"; bullets: string[]; seconds: number }
  | { type: "cta"; brand: string; slogan: string; seconds: number };

const toAbs = (baseUrl: string, maybePath?: string | null) => {
  if (!maybePath) return null;
  if (maybePath.startsWith("http://") || maybePath.startsWith("https://")) return maybePath;
  return `${baseUrl}${maybePath}`;
};

export const AdTemplate: React.FC<{
  brand: string;
  slogan: string;
  storyboard: Scene[];
  baseUrl: string;
  assets?: { logoUrl?: string | null; images?: string[] };
}> = ({ brand, slogan, storyboard, baseUrl, assets }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sb: Scene[] =
    storyboard?.length > 0
      ? storyboard
      : [
          { type: "intro", text: "From Vision to Digital Reality", seconds: 6 },
          { type: "value", bullets: ["Modern Websites", "Custom Software", "Fast & Secure", "Scalable"], seconds: 10 },
          { type: "cta", brand, slogan, seconds: 8 },
        ];

  const introFrames = sb[0].seconds * fps;
  const valueFrames = sb[1].seconds * fps;

  const isIntro = frame < introFrames;
  const isValue = frame >= introFrames && frame < introFrames + valueFrames;
  const isCta = frame >= introFrames + valueFrames;

  const logoAbs = toAbs(baseUrl, assets?.logoUrl ?? null);
  const imagesAbs = (assets?.images ?? []).map((p) => toAbs(baseUrl, p)).filter(Boolean) as string[];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1224", color: "white", fontFamily: "system-ui" }}>
      {isIntro && <Intro text={(sb[0] as any).text} logoUrl={logoAbs} />}
      {isValue && <Value bullets={(sb[1] as any).bullets} localFrame={frame - introFrames} images={imagesAbs} />}
      {isCta && <CTA brand={(sb[2] as any).brand} slogan={(sb[2] as any).slogan} localFrame={frame - introFrames - valueFrames} />}
    </AbsoluteFill>
  );
};

const Intro: React.FC<{ text: string; logoUrl: string | null }> = ({ text, logoUrl }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(f, [0, fps * 0.7], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(f, [0, fps * 1.5], [30, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      {logoUrl && (
        <img
          src={logoUrl}
          style={{
            width: 180,
            height: 180,
            objectFit: "contain",
            marginBottom: 22,
            opacity,
            filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.35))",
          }}
        />
      )}

      <div style={{ fontSize: 64, fontWeight: 900, opacity, transform: `translateY(${y}px)`, textAlign: "center" }}>
        {text}
      </div>
      <div style={{ marginTop: 18, fontSize: 26, opacity: opacity * 0.9 }}>Cinematic transitions • Social-ready</div>
    </AbsoluteFill>
  );
};

const Value: React.FC<{ bullets: string[]; localFrame: number; images: string[] }> = ({ bullets, localFrame, images }) => {
  const { fps } = useVideoConfig();

  const fade = interpolate(localFrame, [0, fps * 0.8], [0, 1], { extrapolateRight: "clamp" });

  const secondsPerImage = 3;
  const framesPerImage = secondsPerImage * fps;

  const safeLen = Math.max(images.length, 1);
  const idx = Math.floor(localFrame / framesPerImage) % safeLen;
  const inFrame = localFrame % framesPerImage;

  const imgOpacity =
    images.length > 0
      ? interpolate(
          inFrame,
          [0, fps * 0.5, framesPerImage - fps * 0.5, framesPerImage],
          [0, 1, 1, 0],
          { extrapolateRight: "clamp" }
        )
      : 0;

  const scale =
    images.length > 0
      ? interpolate(inFrame, [0, framesPerImage], [1.02, 1.08], { extrapolateRight: "clamp" })
      : 1;

  return (
    <AbsoluteFill style={{ padding: 90 }}>
      {images.length > 0 && (
        <AbsoluteFill style={{ opacity: imgOpacity }}>
          <img
            src={images[idx]}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale})`,
              filter: "brightness(0.55) contrast(1.05)",
            }}
          />
        </AbsoluteFill>
      )}

      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 56, fontWeight: 950, marginBottom: 20, opacity: fade }}>What we deliver</div>
        <div style={{ display: "grid", gap: 14 }}>
          {bullets.map((b, i) => (
            <Bullet key={i} text={b} index={i} baseFrame={localFrame} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Bullet: React.FC<{ text: string; index: number; baseFrame: number }> = ({ text, index, baseFrame }) => {
  const { fps } = useVideoConfig();
  const start = index * Math.floor(fps * 0.6);
  const f = Math.max(0, baseFrame - start);

  const opacity = interpolate(f, [0, fps * 0.6], [0, 1], { extrapolateRight: "clamp" });
  const x = interpolate(f, [0, fps * 0.9], [-20, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        padding: "14px 18px",
        borderRadius: 16,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        opacity,
        transform: `translateX(${x}px)`,
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(120,200,255,0.95)" }} />
      <div style={{ fontSize: 34, fontWeight: 650 }}>{text}</div>
    </div>
  );
};

const CTA: React.FC<{ brand: string; slogan: string; localFrame: number }> = ({ brand, slogan, localFrame }) => {
  const { fps } = useVideoConfig();
  const fade = interpolate(localFrame, [0, fps * 1.0], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{ textAlign: "center", opacity: fade }}>
        <div style={{ fontSize: 72, fontWeight: 950 }}>{brand}</div>
        <div style={{ marginTop: 14, fontSize: 30, opacity: 0.92 }}>{slogan}</div>
        <div
          style={{
            marginTop: 34,
            padding: "14px 22px",
            borderRadius: 999,
            display: "inline-block",
            background: "rgba(120,200,255,0.20)",
            border: "1px solid rgba(120,200,255,0.55)",
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          Message us to get started
        </div>
      </div>
    </AbsoluteFill>
  );
};