import React from "react";
import { Composition } from "remotion";
import { AdTemplate } from "./compositions/AdTemplate";

const fps = 24;
const durationInFrames = 24 * fps;

const defaultProps = {
  brand: "Duble-S Technology",
  slogan: "Digital Solutions for Modern Businesses",
  baseUrl: "http://localhost:3000",
  assets: { logoUrl: null as string | null, images: [] as string[] },
  storyboard: [
    { type: "intro", text: "From Vision to Digital Reality", seconds: 6 },
    { type: "value", bullets: ["Modern Websites", "Custom Software", "Fast & Secure", "Scalable"], seconds: 10 },
    { type: "cta", brand: "Duble-S Technology", slogan: "Digital Solutions for Modern Businesses", seconds: 8 },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AdSquare"
        component={AdTemplate}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1080}
        height={1080}
        defaultProps={defaultProps}
      />
      <Composition
        id="AdVertical"
        component={AdTemplate}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
      <Composition
        id="AdHorizontal"
        component={AdTemplate}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
    </>
  );
};