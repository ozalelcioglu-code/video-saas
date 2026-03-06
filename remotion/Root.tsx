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
      { type: "text", text: "Welcome to Duble-S Technology", seconds: 3 },
      { type: "text", text: "We build modern digital solutions", seconds: 3 },
      { type: "text", text: "Web • AI • Software", seconds: 3 },
      { type: "text", text: "Fast. Secure. Scalable.", seconds: 3 },
    ],
    assets: {
      logoUrl: "",
      images: [],
    },
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