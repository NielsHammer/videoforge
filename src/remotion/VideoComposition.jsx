import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, staticFile } from "remotion";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { FullscreenScene } from "./components/FullscreenScene";
import { TextFlash } from "./components/TextFlash";
import { SectionBreak } from "./components/SectionBreak";
import { NumberReveal } from "./components/NumberReveal";
import { ComparisonBar } from "./components/ComparisonBar";
import { AccentElements } from "./components/AccentElements";
import { WordSubtitle } from "./components/WordSubtitle";
import { SplitLayout } from "./components/SplitLayout";
// v24 infographic components (9)
import { AnimatedLineChart } from "./components/AnimatedLineChart";
import { DonutChart } from "./components/DonutChart";
import { ProgressBar } from "./components/ProgressBar";
import { Timeline } from "./components/Timeline";
import { Leaderboard } from "./components/Leaderboard";
import { ProcessFlow } from "./components/ProcessFlow";
import { StatCard } from "./components/StatCard";
import { QuoteCard } from "./components/QuoteCard";
import { Checklist } from "./components/Checklist";
// v26 infographic components (11 new = 20 total)
import { HorizontalBarChart } from "./components/HorizontalBarChart";
import { VerticalBarChart } from "./components/VerticalBarChart";
import { ScaleComparison } from "./components/ScaleComparison";
import { MapHighlight } from "./components/MapHighlight";
import { BodyDiagram } from "./components/BodyDiagram";
import { FunnelChart } from "./components/FunnelChart";
import { GrowthCurve } from "./components/GrowthCurve";
import { RankingCards } from "./components/RankingCards";
import { SplitComparison } from "./components/SplitComparison";
import { IconGrid } from "./components/IconGrid";
import { FlowDiagram } from "./components/FlowDiagram";

export const VideoComposition = ({ clips, wordTimestamps, theme }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#060c24" }}>
      <AnimatedBackground theme={theme || "blue_grid"} />
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

const NO_SUBTITLE_TYPES = ["section_break"];

const GRAPHIC_TYPES = [
  "number_reveal", "section_break", "comparison", "text_flash",
  "line_chart", "donut_chart", "progress_bar", "timeline",
  "leaderboard", "process_flow", "stat_card", "quote_card", "checklist",
  "horizontal_bar", "vertical_bar", "scale_comparison", "map_highlight",
  "body_diagram", "funnel_chart", "growth_curve", "ranking_cards",
  "split_comparison", "icon_grid", "flow_diagram"
];

const ClipRenderer = ({ clip, clipIndex, totalClips, wordTimestamps, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const type = clip.visual_type;
  const style = clip.display_style || "split_left";
  const imgSrc = clip.imagePath ? staticFile(clip.imagePath) : null;

  const isGraphicOnly = GRAPHIC_TYPES.includes(type);
  const isImage = type === "stock" || type === "ai_image" || type === "web_image";
  const isSplit = style === "split_left" || style === "split_right";
  const isFullscreen = style === "fullscreen" || style === "fullscreen_zoom";

  // Fade in/out
  let fadeIn, fadeOut;
  if (isGraphicOnly) {
    fadeIn = interpolate(frame, [0, 2], [0, 1], { extrapolateRight: "clamp" });
    fadeOut = interpolate(frame, [durationInFrames - 2, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  } else {
    const fadeFrames = [fps * 0.08, fps * 0.04, fps * 0.12, fps * 0.06][clipIndex % 4];
    fadeIn = interpolate(frame, [0, fadeFrames], [0, 1], { extrapolateRight: "clamp" });
    fadeOut = interpolate(frame, [durationInFrames - fps * 0.06, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }

  const clipWords = (clip.subtitle_words || []).map(idx => wordTimestamps[idx]).filter(Boolean);
  const showSubtitles = clipWords.length > 0 && !NO_SUBTITLE_TYPES.includes(type);

  let subtitlePosition = "bottom";
  if (isSplit && isImage) {
    subtitlePosition = style === "split_left" ? "split_right" : "split_left";
  }

  const cd = clip.chart_data;

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      {isImage && isFullscreen && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: "#060c24", zIndex: 0 }} />
      )}

      {/* ═══ SPLIT LAYOUT ═══ */}
      {isImage && isSplit && <SplitLayout imageSrc={imgSrc} position={style === "split_left" ? "left" : "right"} clipFrame={frame} clipIndex={clipIndex} />}

      {/* ═══ STANDARD IMAGE ═══ */}
      {isImage && !isSplit && style === "fullscreen" && <FullscreenScene imageSrc={imgSrc} clipFrame={frame} clipIndex={clipIndex} sceneIndex={clipIndex} framed={false} />}
      {isImage && !isSplit && style === "framed" && <FullscreenScene imageSrc={imgSrc} clipFrame={frame} clipIndex={clipIndex} sceneIndex={clipIndex} framed={true} />}
      {isImage && !isSplit && style === "fullscreen_zoom" && <FullscreenScene imageSrc={imgSrc} clipFrame={frame} zoom={true} clipIndex={clipIndex} sceneIndex={clipIndex} framed={false} />}

      {/* ═══ ORIGINAL GRAPHIC TYPES ═══ */}
      {type === "number_reveal" && clip.number_data && <NumberReveal data={clip.number_data} clipFrame={frame} theme={theme} clipIndex={clipIndex} />}
      {type === "comparison" && clip.comparison_data && <ComparisonBar data={clip.comparison_data} clipFrame={frame} theme={theme} />}
      {type === "section_break" && <SectionBreak data={clip.section_data || { number: "#1", title: "" }} theme={theme} clipIndex={clipIndex} />}
      {type === "text_flash" && <TextFlash text={clip.text_flash_text || ""} clipFrame={frame} theme={theme} />}

      {/* ═══ V24 INFOGRAPHIC TYPES (9) ═══ */}
      {type === "line_chart" && cd && <AnimatedLineChart data={cd} clipFrame={frame} theme={theme} />}
      {type === "donut_chart" && cd && <DonutChart data={cd} clipFrame={frame} theme={theme} />}
      {type === "progress_bar" && cd && <ProgressBar data={cd} clipFrame={frame} theme={theme} />}
      {type === "timeline" && cd && <Timeline data={cd} clipFrame={frame} theme={theme} />}
      {type === "leaderboard" && cd && <Leaderboard data={cd} clipFrame={frame} theme={theme} />}
      {type === "process_flow" && cd && <ProcessFlow data={cd} clipFrame={frame} theme={theme} />}
      {type === "stat_card" && cd && <StatCard data={cd} clipFrame={frame} theme={theme} />}
      {type === "quote_card" && cd && <QuoteCard data={cd} clipFrame={frame} theme={theme} />}
      {type === "checklist" && cd && <Checklist data={cd} clipFrame={frame} theme={theme} />}

      {/* ═══ V26 INFOGRAPHIC TYPES (11 new) ═══ */}
      {type === "horizontal_bar" && cd && <HorizontalBarChart data={cd} clipFrame={frame} theme={theme} />}
      {type === "vertical_bar" && cd && <VerticalBarChart data={cd} clipFrame={frame} theme={theme} />}
      {type === "scale_comparison" && cd && <ScaleComparison data={cd} clipFrame={frame} theme={theme} />}
      {type === "map_highlight" && cd && <MapHighlight data={cd} clipFrame={frame} theme={theme} />}
      {type === "body_diagram" && cd && <BodyDiagram data={cd} clipFrame={frame} theme={theme} />}
      {type === "funnel_chart" && cd && <FunnelChart data={cd} clipFrame={frame} theme={theme} />}
      {type === "growth_curve" && cd && <GrowthCurve data={cd} clipFrame={frame} theme={theme} />}
      {type === "ranking_cards" && cd && <RankingCards data={cd} clipFrame={frame} theme={theme} />}
      {type === "split_comparison" && cd && <SplitComparison data={cd} clipFrame={frame} theme={theme} />}
      {type === "icon_grid" && cd && <IconGrid data={cd} clipFrame={frame} theme={theme} />}
      {type === "flow_diagram" && cd && <FlowDiagram data={cd} clipFrame={frame} theme={theme} />}

      {/* ═══ SUBTITLES ═══ */}
      {showSubtitles && <WordSubtitle words={clipWords} clipStartTime={clip.start_time} position={subtitlePosition} theme={theme} />}
    </AbsoluteFill>
  );
};
