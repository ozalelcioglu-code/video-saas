import React from "react";
import { Composition } from "remotion";
import { AdTemplate } from "./compositions/AdTemplate";

export const RemotionRoot: React.FC = () => {
  const defaultProps = {
    brand: "Duble-S Technology",
    slogan: "Digital Solutions for Modern Businesses",
    baseUrl: "",
    ratio: "square",
    durationSec: 24,
    storyboard: [
      {
        type: "intro",
        text: "Create stunning social media videos with AI",
        seconds: 6,
      },
      {
        type: "value",
        bullets: [
          "AI Storyboard Generation",
          "Cinematic Social Videos",
          "Fast & Scalable Content Creation",
        ],
        seconds: 8,
      },
      {
        type: "cta",
        brand: "Duble-S Technology",
        slogan: "Turn Ideas into Viral Videos",
        seconds: 10,
      },
    ],
    assets: {
      logoUrl: "",
      images: [],
    },
  };

  return (
    <>
      < Composition
        id="AdSquare"
        component={AdTemplate as any}
        durationInFrames={24 * 30}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={defaultProps as any}
      />

      < Composition
        id="AdVertical"
        component={AdTemplate as any}
        durationInFrames={24 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps as any}
      />

      < Composition
        id="AdHorizontal"
        component={AdTemplate as any}
        durationInFrames={24 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultProps as any}
      />
    </>
  );
};