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
// batch2
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
// batch3
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
// batch4 — 31 new components
import { PullQuote } from "./components/PullQuote";
import { StatComparison } from "./components/StatComparison";
import { BulletList } from "./components/BulletList";
import { MythFact } from "./components/MythFact";
import { StepReveal } from "./components/StepReveal";
import { ProCon } from "./components/ProCon";
import { ScoreCard } from "./components/ScoreCard";
import { PersonProfile } from "./components/PersonProfile";
import { RedditPost } from "./components/RedditPost";
import { GoogleSearch } from "./components/GoogleSearch";
import { ThreePoints } from "./components/ThreePoints";
import { StackedBar } from "./components/StackedBar";
import { CountdownTimer } from "./components/CountdownTimer";
import { VoteBar } from "./components/VoteBar";
import { MapCallout } from "./components/MapCallout";
import { NewsHeadline } from "./components/NewsHeadline";
import { InstagramPost } from "./components/InstagramPost";
import { YouTubeCard } from "./components/YouTubeCard";
import { QuizCard } from "./components/QuizCard";
import { PortfolioBreakdown } from "./components/PortfolioBreakdown";
import { ROICalculator } from "./components/ROICalculator";
import { TimelapseBar } from "./components/TimelapseBar";
import { SpeedMeter } from "./components/SpeedMeter";
import { CandlestickChart } from "./components/CandlestickChart";
import { ConversationBubble } from "./components/ConversationBubble";
import { LoadingBar } from "./components/LoadingBar";
import { WealthLadder } from "./components/WealthLadder";
import { RuleCard } from "./components/RuleCard";
import { AlertBanner } from "./components/AlertBanner";
import { BigNumber } from "./components/BigNumber";
import { MindsetShift } from "./components/MindsetShift";

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

// Types that don't need an image fetched — pure graphic overlays
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
  "thumbs_up","side_by_side","youtube_progress","polaroid_stack",
  "warning_siren",
  // batch4
  "pull_quote","stat_comparison","bullet_list","myth_fact","step_reveal",
  "pro_con","score_card","person_profile","reddit_post","google_search",
  "three_points","stacked_bar","countdown_timer","vote_bar","map_callout",
  "news_headline","instagram_post","youtube_card","quiz_card",
  "portfolio_breakdown","roi_calculator","timelapse_bar","speed_meter",
  "candlestick_chart","conversation_bubble","loading_bar","wealth_ladder",
  "rule_card","alert_banner","big_number","mindset_shift",
  // NOTE: quote_overlay, overlay_caption, polaroid_stack need images — NOT listed here
];

const ClipRenderer = ({ clip, clipIndex, totalClips, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const type = clip.visual_type;
  const style = clip.display_style;

  const isImage = !GRAPHIC_TYPES.includes(type);
  const isFullscreen = style === "fullscreen" || style === "fullscreen_zoom";
  const isSplit = style === "split_left" || style === "split_right";
  const isFramed = style === "framed" || (!isFullscreen && !isSplit);

  const imgSrc = clip.imagePath ? staticFile(clip.imagePath) : null;
  const imgPath = clip.imagePath || null;

  // Zoom for fullscreen
  const zoomScale = style === "fullscreen_zoom"
    ? interpolate(frame, [0, durationInFrames], [1.0, 1.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

  // Fade in/out
  let fadeIn = 1, fadeOut = 1;
  if (isImage) {
    const zoomOpacity = interpolate(frame, [0, fps * 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    fadeIn = zoomOpacity;
    fadeOut = interpolate(frame, [durationInFrames - fps * 0.06, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }

  // B-roll crossfade — disable for split layouts to prevent flicker
  let imgOpacity = 1;
  if (clip.imagePaths && clip.imagePaths.length > 1 && !isSplit) {
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

      {/* ═══ BATCH 1 ═══ */}
      {type === "kinetic_text" && <KineticText data={ad} clipFrame={frame} theme={theme} />}
      {type === "spotlight_stat" && <SpotlightStat data={ad} clipFrame={frame} theme={theme} />}
      {type === "icon_burst" && <IconBurst data={ad} clipFrame={frame} theme={theme} />}

      {/* ═══ BATCH 2 ═══ */}
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

      {/* ═══ BATCH 3 ═══ */}
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

      {/* ═══ BATCH 4 — 31 new components ═══ */}
      {type === "pull_quote" && <PullQuote data={ad} clipFrame={frame} theme={theme} />}
      {type === "stat_comparison" && <StatComparison data={ad} clipFrame={frame} theme={theme} />}
      {type === "bullet_list" && <BulletList data={ad} clipFrame={frame} theme={theme} />}
      {type === "myth_fact" && <MythFact data={ad} clipFrame={frame} theme={theme} />}
      {type === "step_reveal" && <StepReveal data={ad} clipFrame={frame} theme={theme} />}
      {type === "pro_con" && <ProCon data={ad} clipFrame={frame} theme={theme} />}
      {type === "score_card" && <ScoreCard data={ad} clipFrame={frame} theme={theme} />}
      {type === "person_profile" && <PersonProfile data={ad} clipFrame={frame} theme={theme} />}
      {type === "reddit_post" && <RedditPost data={ad} clipFrame={frame} theme={theme} />}
      {type === "google_search" && <GoogleSearch data={ad} clipFrame={frame} theme={theme} />}
      {type === "three_points" && <ThreePoints data={ad} clipFrame={frame} theme={theme} />}
      {type === "stacked_bar" && <StackedBar data={ad} clipFrame={frame} theme={theme} />}
      {type === "countdown_timer" && <CountdownTimer data={ad} clipFrame={frame} theme={theme} />}
      {type === "vote_bar" && <VoteBar data={ad} clipFrame={frame} theme={theme} />}
      {type === "map_callout" && <MapCallout data={ad} clipFrame={frame} theme={theme} />}
      {type === "news_headline" && <NewsHeadline data={ad} clipFrame={frame} theme={theme} />}
      {type === "instagram_post" && <InstagramPost data={ad} clipFrame={frame} theme={theme} />}
      {type === "youtube_card" && <YouTubeCard data={ad} clipFrame={frame} theme={theme} />}
      {type === "quiz_card" && <QuizCard data={ad} clipFrame={frame} theme={theme} />}
      {type === "portfolio_breakdown" && <PortfolioBreakdown data={ad} clipFrame={frame} theme={theme} />}
      {type === "roi_calculator" && <ROICalculator data={ad} clipFrame={frame} theme={theme} />}
      {type === "timelapse_bar" && <TimelapseBar data={ad} clipFrame={frame} theme={theme} />}
      {type === "speed_meter" && <SpeedMeter data={ad} clipFrame={frame} theme={theme} />}
      {type === "candlestick_chart" && <CandlestickChart data={ad} clipFrame={frame} theme={theme} />}
      {type === "conversation_bubble" && <ConversationBubble data={ad} clipFrame={frame} theme={theme} />}
      {type === "loading_bar" && <LoadingBar data={ad} clipFrame={frame} theme={theme} />}
      {type === "wealth_ladder" && <WealthLadder data={ad} clipFrame={frame} theme={theme} />}
      {type === "rule_card" && <RuleCard data={ad} clipFrame={frame} theme={theme} />}
      {type === "alert_banner" && <AlertBanner data={ad} clipFrame={frame} theme={theme} />}
      {type === "big_number" && <BigNumber data={ad} clipFrame={frame} theme={theme} />}
      {type === "mindset_shift" && <MindsetShift data={ad} clipFrame={frame} theme={theme} />}

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

      {/* ═══ FRAMED LAYOUT ═══ */}
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

      {/* ═══ FULLSCREEN ═══ */}
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
