import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { AnimatedBackground } from './components/AnimatedBackground';
import { BRollFrame } from './components/BRollFrame';
import { TitleCard } from './components/TitleCard';
import { StatCallout } from './components/StatCallout';
import { ListReveal } from './components/ListReveal';
import { Comparison } from './components/Comparison';
import { QuoteCard } from './components/QuoteCard';
import { KeywordOverlay } from './components/KeywordOverlay';

export const VideoComposition = ({ scenes }) => {
  const { fps } = useVideoConfig();
  
  let currentFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a14' }}>
      {/* Animated grid background - always visible */}
      <AnimatedBackground />
      
      {/* Render each scene as a Sequence */}
      {scenes.map((scene, index) => {
        const durationFrames = Math.ceil(scene.duration * fps);
        const startFrame = currentFrame;
        currentFrame += durationFrames;

        return (
          <Sequence
            key={index}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <SceneRenderer scene={scene} index={index} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const SceneRenderer = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Fade in/out for scene transitions
  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.ease,
  });
  
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps * 0.4, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.ease }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      {scene.visual_type === 'stock' && (
        <BRollScene scene={scene} />
      )}
      {scene.visual_type === 'title_card' && (
        <TitleCard data={scene.motion_graphic_data || { title: scene.narration.substring(0, 40) }} />
      )}
      {scene.visual_type === 'motion_graphic' && (
        <MotionGraphicScene scene={scene} />
      )}
    </AbsoluteFill>
  );
};

const BRollScene = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const subClips = scene.sub_clips || [];
  
  if (subClips.length === 0) return null;

  // Calculate which sub-clip to show based on current frame
  const clipDuration = durationInFrames / subClips.length;
  const currentClipIndex = Math.min(
    Math.floor(frame / clipDuration),
    subClips.length - 1
  );
  const currentClip = subClips[currentClipIndex];
  const clipFrame = frame - (currentClipIndex * clipDuration);

  // Crossfade between clips
  const clipFadeIn = interpolate(clipFrame, [0, fps * 0.25], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Extract keywords from narration segment for overlay
  const keywords = extractKeywords(currentClip.narration_segment || '');

  return (
    <AbsoluteFill>
      {/* B-roll in a frame (not fullscreen) */}
      <BRollFrame
        videoSrc={currentClip.videoPath}
        opacity={clipFadeIn}
        clipIndex={currentClipIndex}
      />
      
      {/* Keyword overlay */}
      {keywords.length > 0 && (
        <KeywordOverlay keywords={keywords} clipFrame={clipFrame} fps={fps} />
      )}
    </AbsoluteFill>
  );
};

const MotionGraphicScene = ({ scene }) => {
  const type = scene.motion_graphic_type || 'stat_callout';
  const data = scene.motion_graphic_data || {};

  switch (type) {
    case 'stat_callout':
      return <StatCallout data={data} />;
    case 'list_reveal':
      return <ListReveal data={data} />;
    case 'comparison':
      return <Comparison data={data} />;
    case 'quote_card':
      return <QuoteCard data={data} />;
    default:
      return <StatCallout data={data} />;
  }
};

function extractKeywords(text) {
  if (!text) return [];
  // Extract important words (nouns, numbers, key phrases)
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'it', 'its', 'your', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'we', 'us', 'our', 'ours', 'they', 'them', 'their', 'theirs']);
  
  const words = text.split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !stopWords.has(w.toLowerCase().replace(/[.,!?]/g, '')));
  
  // Return top 2 keywords
  return words.slice(0, 2).map(w => w.replace(/[.,!?]/g, ''));
}
