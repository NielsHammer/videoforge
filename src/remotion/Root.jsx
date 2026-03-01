import React from "react";
import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";

export const RemotionRoot = () => {
  const defaultProps = {
    clips: [],
    wordTimestamps: [],
    theme: "blue",
  };

  return (
    <>
      <Composition
        id="VideoForge"
        component={VideoComposition}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
    </>
  );
};
