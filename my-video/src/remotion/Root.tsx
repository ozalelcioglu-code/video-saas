import { Composition } from "remotion";
import { Main } from "./MyComp/Main";
import { NextLogo } from "./MyComp/NextLogo";

export default function RemotionRoot() {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={200}
        fps={30}
        width={1280}
        height={720}
      />

      <Composition
        id="NextLogo"
        component={NextLogo}
        durationInFrames={120}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ outProgress: 0 }}
      />
     
    </>
  );
}