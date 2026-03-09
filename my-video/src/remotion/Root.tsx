import React from "react";
import { Composition } from "remotion";
import { Main } from "./MyComp/Main";
import { NextLogo } from "./MyComp/NextLogo";
import {
  COMP_NAME,
  defaultMyCompProps,
  VIDEO_FPS,
  getCompositionDurationInFrames,
  getVideoDimensions,
  type MyCompProps,
} from "./types/constants";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition<MyCompProps>
        id={COMP_NAME}
        component={Main}
        fps={VIDEO_FPS}
        defaultProps={defaultMyCompProps}
        durationInFrames={200}
        width={1280}
        height={720}
        calculateMetadata={({ props }) => {
          const mergedProps: MyCompProps = {
            ...defaultMyCompProps,
            ...props,
            storyboard: props.storyboard ?? defaultMyCompProps.storyboard,
          };

          const ratio =
            mergedProps.ratio ??
            mergedProps.storyboard?.ratio ??
            "horizontal";

          const { width, height } = getVideoDimensions(ratio);
          const durationInFrames =
            getCompositionDurationInFrames(mergedProps);

          return {
            props: mergedProps,
            durationInFrames,
            width,
            height,
            fps: VIDEO_FPS,
          };
        }}
      />

      <Composition
        id="NextLogo"
        component={NextLogo}
        durationInFrames={300}
        fps={30}
        width={140}
        height={140}
        defaultProps={{ outProgress: 0 }}
      />
    </>
  );
};