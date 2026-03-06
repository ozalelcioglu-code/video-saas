import React from "react";
import { Composition } from "remotion";
import { AdTemplate } from "./compositions/AdTemplate";

type AdTemplateProps = React.ComponentProps<typeof AdTemplate>;

export const RemotionRoot: React.FC = () => {
  const defaultProps: AdTemplateProps = {
    brand: "Duble-S Technology",
    slogan: "Digital Solutions for Modern Businesses",
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
  };

  return (
    <>
      <Composition
        id="AdSquare"
        component={AdTemplate}
        durationInFrames={24 * 30}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={defaultProps}
      />

      <Composition
        id="AdVertical"
        component={AdTemplate}
        durationInFrames={24 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />

      <Composition
        id="AdHorizontal"
        component={AdTemplate}
        durationInFrames={24 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
    </>
  );
};