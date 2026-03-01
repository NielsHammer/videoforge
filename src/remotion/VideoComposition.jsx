import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, staticFile } from "remotion";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { CutoutScene } from "./components/CutoutScene";
import { FullscreenScene } from "./components/FullscreenScene";
import { LayeredScene } from "./components/LayeredScene";
import { TextFlash } from "./components/TextFlash";
import { SectionBreak } from "./components/SectionBreak";
import { NumberReveal } from "./components/NumberReveal";
import { ComparisonBar } from "./components/ComparisonBar";
import { AccentElements } from "./components/AccentElements";
import { WordSubtitle } from "./components/WordSubtitle";

export const VideoComposition = ({ clips, wordTimestamps, theme }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#050510" }}>
      <AnimatedBackground theme={theme || "blue"} />
      {clips.map((clip, index) => {
        const startFrame = Math.round(clip.start_time * fps);
        const endFrame = Math.round(clip.end_time * fps);
        const dur = endFrame - startFrame;
        if (dur <= 0) return null;

        return (
          <Sequence key={index} from={startFrame} durationInFrames={dur}>
            <ClipRenderer clip={clip} clipIndex={index} totalClips={clips.length} wordTimestamps={wordTimestamps} theme={theme} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const ClipRenderer = ({ clip, clipIndex, totalClips, wordTimestamps, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade in/out with crossfade overlap
  const fadeIn = interpolate(frame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - fps * 0.15, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const type = clip.visual_type;
  const style = clip.display_style || "framed";
  const imgSrc = clip.imagePath ? staticFile(clip.imagePath) : null;
  const isCutout = clip.isCutout || false;
  const trans = clipIndex % 4;

  // Get words for this clip's subtitles
  const clipWords = (clip.subtitle_words || []).map(idx => wordTimestamps[idx]).filter(Boolean);

  // Subtitle position
  let subPos = "bottom";
  if (style === "cutout_right") subPos = "left";
  else if (style === "cutout_left") subPos = "right";

  const isImage = type === "stock" || type === "ai_image";

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      {/* Visual layer */}
      {isImage && style === "fullscreen" && <FullscreenScene imageSrc={imgSrc} clipFrame={frame} clipIndex={clipIndex} sceneIndex={clipIndex} framed={false} />}
      {isImage && style === "framed" && <FullscreenScene imageSrc={imgSrc} clipFrame={frame} clipIndex={clipIndex} sceneIndex={clipIndex} framed={true} />}
      {isImage && style === "fullscreen_zoom" && <FullscreenScene imageSrc={imgSrc} clipFrame={frame} zoom={true} clipIndex={clipIndex} sceneIndex={clipIndex} framed={false} />}
      {isImage && (style === "cutout_right" || style === "cutout_left") && <CutoutScene imageSrc={imgSrc} position={style.replace("cutout_", "")} clipFrame={frame} transitionType={trans} isCutout={isCutout} />}
      {isImage && style === "layered" && <LayeredScene imageSrc={imgSrc} clipFrame={frame} isCutout={isCutout} />}

      {type === "number_reveal" && clip.number_data && <NumberReveal data={clip.number_data} clipFrame={frame} theme={theme} />}
      {type === "comparison" && clip.comparison_data && <ComparisonBar data={clip.comparison_data} clipFrame={frame} theme={theme} />}
      {type === "section_break" && <SectionBreak data={clip.section_data || { number: "#1", title: "" }} theme={theme} />}
      {type === "text_flash" && <TextFlash text={clip.text_flash_text || ""} clipFrame={frame} theme={theme} />}

      {/* Word-synced subtitles */}
      {clipWords.length > 0 && type !== "text_flash" && (
        <WordSubtitle words={clipWords} clipStartTime={clip.start_time} position={subPos} theme={theme} />
      )}

      <AccentElements sceneIndex={clipIndex} totalScenes={totalClips} />
    </AbsoluteFill>
  );
};
