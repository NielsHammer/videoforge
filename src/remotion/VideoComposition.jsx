import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, staticFile, Easing, Img } from "remotion";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { TextFlash } from "./components/TextFlash";
import { SectionBreak } from "./components/SectionBreak";
import { NumberReveal } from "./components/NumberReveal";
import { ComparisonBar } from "./components/ComparisonBar";
import { SplitReveal } from "./components/SplitReveal";
import { FramedScene } from "./components/FramedScene";
import { KineticText } from "./components/KineticText";
import { SpotlightStat } from "./components/SpotlightStat";
import { IconBurst } from "./components/IconBurst";
import { AnimatedLineChart } from "./components/AnimatedLineChart";
import { DonutChart } from "./components/DonutChart";
import { ProgressBar } from "./components/ProgressBar";
import { Timeline } from "./components/Timeline";
import { Leaderboard } from "./components/Leaderboard";
import { ProcessFlow } from "./components/ProcessFlow";
import { StatCard } from "./components/StatCard";
import { QuoteCard } from "./components/QuoteCard";
import { Checklist } from "./components/Checklist";
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
import { InterruptCard } from "./components/InterruptCard";
import { QuotePull } from "./components/QuotePull";
import { CountdownCorner } from "./components/CountdownCorner";
// batch2 components
import { TypewriterReveal } from "./components/TypewriterReveal";
import { MoneyCounter } from "./components/MoneyCounter";
import { GlitchText } from "./components/GlitchText";
import { CheckmarkBuild } from "./components/CheckmarkBuild";
import { TrendArrow } from "./components/TrendArrow";
import { StockTicker } from "./components/StockTicker";
import { PhoneScreen } from "./components/PhoneScreen";
import { TweetCard } from "./components/TweetCard";
import { WordScatter } from "./components/WordScatter";
import { SocialCounter } from "./components/SocialCounter";
import { BeforeAfter } from "./components/BeforeAfter";
import { LightbulbMoment } from "./components/LightbulbMoment";
import { RocketLaunch } from "./components/RocketLaunch";
import { NewsBreaking } from "./components/NewsBreaking";
import { PercentFill } from "./components/PercentFill";
import { QuoteOverlay } from "./components/QuoteOverlay";
import { CompareReveal } from "./components/CompareReveal";
// batch3 components
import { HighlightBuild } from "./components/HighlightBuild";
import { CountUp } from "./components/CountUp";
import { NeonSign } from "./components/NeonSign";
import { ReactionFace } from "./components/ReactionFace";
import { ThumbsUpReveal } from "./components/ThumbsUpReveal";
import { SideBySide } from "./components/SideBySide";
import { YouTubeProgress } from "./components/YouTubeProgress";
import { PolaroidStack } from "./components/PolaroidStack";
import { WarningSiren } from "./components/WarningSiren";
import { OverlayCaption } from "./components/OverlayCaption";

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
            <ClipRenderer clip={clip} clipIndex={index} totalClips={clips.length} theme={theme} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const GRAPHIC_TYPES = [
  // legacy infographics
  "number_reveal","section_break","comparison","text_flash",
  "line_chart","donut_chart","progress_bar","timeline",
  "leaderboard","process_flow","stat_card","quote_card","checklist",
  "horizontal_bar","vertical_bar","scale_comparison","map_highlight",
  "body_diagram","funnel_chart","growth_curve","ranking_cards",
  "split_comparison","icon_grid","flow_diagram",
  "interrupt_card","quote_pull","countdown_corner",
  // batch1
  "kinetic_text","spotlight_stat","icon_burst",
  // batch2
  "typewriter_reveal","money_counter","glitch_text","checkmark_build",
  "trend_arrow","stock_ticker","phone_screen","tweet_card","word_scatter",
  "social_counter","before_after","lightbulb_moment","rocket_launch",
  "news_breaking","percent_fill","compare_reveal",
  // batch3
  "highlight_build","count_up","neon_sign","reaction_face",
  "thumbs_up","side_by_side","youtube_progress",
  "warning_siren",
  // NOT included: quote_overlay, overlay_caption, polaroid_stack
  // These render over fetched images — they need image fade timing, not graphic fade
];

const ClipRenderer = ({ clip, clipIndex, totalClips, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const type = clip.visual_type;
  const style = clip.display_style || "framed";

  // B-roll image switching — disabled for split layouts (panel already uses extra images)
  let imgPath = clip.imagePath;
  const isSplitStyle = style === "split_left" || style === "split_right";
  if (clip.imagePaths && clip.imagePaths.length > 1 && !isSplitStyle) {
    const crossfadeEvery = fps * 3.5;
    const safeFrame = Math.min(frame, durationInFrames - fps * 0.5);
    const imgIndex = Math.floor(safeFrame / crossfadeEvery) % clip.imagePaths.length;
    imgPath = clip.imagePaths[imgIndex] || imgPath;
  }

  // Convert to staticFile — publicDir is assetsDir so just use basename
  let imgSrc = null;
  if (imgPath) {
    const basename = (imgPath.includes('/') || imgPath.includes('\\'))
      ? imgPath.replace(/\\/g, '/').split('/').pop()
      : imgPath;
    if (basename) imgSrc = staticFile(basename);
  }

  const isGraphicOnly = GRAPHIC_TYPES.includes(type);
  const isImage = type === "stock" || type === "ai_image" || type === "web_image";
  const isSplit = style === "split_left" || style === "split_right";
  const isFullscreen = style === "fullscreen" || style === "fullscreen_zoom";
  const isFramed = style === "framed";

  // Zoom-to-black transition
  const transitionSpeed = clip.transition_speed || "fast";
  const transitionFrames = transitionSpeed === "slow" ? fps * 0.5 : fps * 0.2;
  const zoomScale = isImage && isFullscreen
    ? interpolate(frame, [durationInFrames - transitionFrames, durationInFrames], [1, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) })
    : 1;
  const zoomOpacity = isImage
    ? interpolate(frame, [durationInFrames - transitionFrames, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

  // Fade in/out
  let fadeIn, fadeOut;
  if (isGraphicOnly) {
    fadeIn = interpolate(frame, [0, 2], [0, 1], { extrapolateRight: "clamp" });
    fadeOut = interpolate(frame, [durationInFrames - 2, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  } else {
    const fadeFrames = [fps * 0.08, fps * 0.04, fps * 0.12, fps * 0.06][clipIndex % 4];
    fadeIn = interpolate(frame, [0, fadeFrames], [0, 1], { extrapolateRight: "clamp" });
    fadeOut = isImage ? zoomOpacity : interpolate(frame, [durationInFrames - fps * 0.06, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }

  // B-roll crossfade — don't crossfade in last second
  let imgOpacity = 1;
  if (clip.imagePaths && clip.imagePaths.length > 1) {
    const crossfadeEvery = fps * 3.5;
    const posInCycle = frame % crossfadeEvery;
    const crossfadeDur = fps * 0.35;
    if (posInCycle < crossfadeDur && frame < durationInFrames - fps) {
      imgOpacity = interpolate(posInCycle, [0, crossfadeDur], [0, 1], { extrapolateRight: "clamp" });
    }
  }

  const cd = clip.chart_data;
  const ad = clip.animation_data || cd;

  return (
    <AbsoluteFill style={{
      opacity: Math.min(fadeIn, fadeOut),
      transform: isImage && isFullscreen ? `scale(${zoomScale})` : undefined,
      transformOrigin: "center center",
    }}>

      {/* ═══ BATCH 1 ANIMATIONS ═══ */}
      {type === "kinetic_text" && <KineticText data={ad} clipFrame={frame} theme={theme} />}
      {type === "spotlight_stat" && <SpotlightStat data={ad} clipFrame={frame} theme={theme} />}
      {type === "icon_burst" && <IconBurst data={ad} clipFrame={frame} theme={theme} />}

      {/* ═══ BATCH 2 ANIMATIONS ═══ */}
      {type === "typewriter_reveal" && <TypewriterReveal data={ad} clipFrame={frame} theme={theme} />}
      {type === "money_counter" && <MoneyCounter data={ad} clipFrame={frame} theme={theme} />}
      {type === "glitch_text" && <GlitchText data={ad} clipFrame={frame} theme={theme} />}
      {type === "checkmark_build" && <CheckmarkBuild data={ad} clipFrame={frame} theme={theme} />}
      {type === "trend_arrow" && <TrendArrow data={ad} clipFrame={frame} theme={theme} />}
      {type === "stock_ticker" && <StockTicker data={ad} clipFrame={frame} theme={theme} />}
      {type === "phone_screen" && <PhoneScreen data={ad} clipFrame={frame} theme={theme} />}
      {type === "tweet_card" && <TweetCard data={ad} clipFrame={frame} theme={theme} />}
      {type === "word_scatter" && <WordScatter data={ad} clipFrame={frame} theme={theme} />}
      {type === "social_counter" && <SocialCounter data={ad} clipFrame={frame} theme={theme} />}
      {type === "before_after" && <BeforeAfter data={ad} clipFrame={frame} theme={theme} />}
      {type === "lightbulb_moment" && <LightbulbMoment data={ad} clipFrame={frame} theme={theme} />}
      {type === "rocket_launch" && <RocketLaunch data={ad} clipFrame={frame} theme={theme} />}
      {type === "news_breaking" && <NewsBreaking data={ad} clipFrame={frame} theme={theme} />}
      {type === "percent_fill" && <PercentFill data={ad} clipFrame={frame} theme={theme} />}
      {type === "quote_overlay" && <QuoteOverlay data={ad} imagePath={imgPath} clipFrame={frame} theme={theme} />}
      {type === "compare_reveal" && <CompareReveal data={ad} clipFrame={frame} theme={theme} />}

      {/* ═══ BATCH 3 ANIMATIONS ═══ */}
      {type === "highlight_build" && <HighlightBuild data={ad} clipFrame={frame} theme={theme} />}
      {type === "count_up" && <CountUp data={ad} clipFrame={frame} theme={theme} />}
      {type === "neon_sign" && <NeonSign data={ad} clipFrame={frame} theme={theme} />}
      {type === "reaction_face" && <ReactionFace data={ad} clipFrame={frame} theme={theme} />}
      {type === "thumbs_up" && <ThumbsUpReveal data={ad} clipFrame={frame} theme={theme} />}
      {type === "side_by_side" && <SideBySide data={ad} imagePaths={clip.imagePaths || []} clipFrame={frame} theme={theme} />}
      {type === "youtube_progress" && <YouTubeProgress data={ad} clipFrame={frame} theme={theme} />}
      {type === "polaroid_stack" && <PolaroidStack data={ad} imagePaths={clip.imagePaths || []} clipFrame={frame} theme={theme} />}
      {type === "warning_siren" && <WarningSiren data={ad} clipFrame={frame} theme={theme} />}
      {type === "overlay_caption" && <OverlayCaption data={ad} imagePath={imgPath} clipFrame={frame} theme={theme} />}

      {/* ═══ SPLIT LAYOUT ═══ */}
      {isImage && isSplit && (
        <div style={{ opacity: imgOpacity }}>
          <SplitReveal
            imageSrc={imgSrc}
            position={style === "split_left" ? "left" : "right"}
            clipFrame={frame}
            clipIndex={clipIndex}
            theme={theme}
            clip={clip}
          />
        </div>
      )}

      {/* ═══ FRAMED LAYOUT — shows background theme ═══ */}
      {isImage && isFramed && imgSrc && (
        <div style={{ opacity: imgOpacity }}>
          <FramedScene
            imageSrc={imgSrc}
            clipFrame={frame}
            theme={theme}
            clip={clip}
            variant={["center","wide","offset_left","offset_right"][clipIndex % 4]}
          />
        </div>
      )}

      {/* ═══ FULLSCREEN — used sparingly ═══ */}
      {isImage && isFullscreen && (
        <>
          <div style={{ position: "absolute", inset: 0, backgroundColor: "#060c24", zIndex: 0 }} />
          {imgSrc && (
            <div style={{ position: "absolute", inset: 0, opacity: imgOpacity, zIndex: 1 }}>
              <Img src={imgSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            background: "radial-gradient(ellipse at center, transparent 55%, rgba(6,12,36,0.35) 100%)",
            pointerEvents: "none",
          }} />
        </>
      )}

      {/* ═══ LEGACY INFOGRAPHICS ═══ */}
      {type === "number_reveal" && clip.number_data && <NumberReveal data={clip.number_data} clipFrame={frame} theme={theme} />}
      {type === "comparison" && clip.comparison_data && <ComparisonBar data={clip.comparison_data} clipFrame={frame} theme={theme} />}
      {type === "section_break" && clip.section_data && <SectionBreak data={clip.section_data} clipFrame={frame} theme={theme} />}
      {type === "text_flash" && clip.text_flash_text && <TextFlash text={clip.text_flash_text} clipFrame={frame} theme={theme} />}
      {type === "line_chart" && cd && <AnimatedLineChart data={cd} clipFrame={frame} theme={theme} />}
      {type === "donut_chart" && cd && <DonutChart data={cd} clipFrame={frame} theme={theme} />}
      {type === "progress_bar" && cd && <ProgressBar data={cd} clipFrame={frame} theme={theme} />}
      {type === "timeline" && cd && <Timeline data={cd} clipFrame={frame} theme={theme} />}
      {type === "leaderboard" && cd && <Leaderboard data={cd} clipFrame={frame} theme={theme} />}
      {type === "process_flow" && cd && <ProcessFlow data={cd} clipFrame={frame} theme={theme} />}
      {type === "stat_card" && cd && <StatCard data={cd} clipFrame={frame} theme={theme} />}
      {type === "quote_card" && cd && <QuoteCard data={cd} clipFrame={frame} theme={theme} />}
      {type === "checklist" && cd && <Checklist data={cd} clipFrame={frame} theme={theme} />}
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
      {type === "interrupt_card" && clip.interrupt_data && <InterruptCard data={clip.interrupt_data} clipFrame={frame} theme={theme} />}
      {type === "quote_pull" && clip.quote_data && <QuotePull data={clip.quote_data} clipFrame={frame} theme={theme} />}
      {type === "countdown_corner" && clip.countdown_data && <CountdownCorner data={clip.countdown_data} clipFrame={frame} theme={theme} />}
    </AbsoluteFill>
  );
};
