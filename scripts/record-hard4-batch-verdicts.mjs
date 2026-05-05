// Niels's verdicts on the v3-hard4 batch.
// 1 WINNER (black hole), 4 NOs.
// Pool moves from 18W+31L to 19W+35L.
import { approveFromCli, rejectFromCli, loadWinners, loadLosers } from '../src/thumbnail-learning-pool.js';

const winners = [
  {
    outputDir: '/opt/videoforge/output/v3-hard4/black-hole',
    reason: "WINNER. Accretion disk image is unmistakably a black hole. 'FROZEN FOREVER' captures the time-dilation concept in two words that create dread. Image + hook TOGETHER instantly tell you what this video is about AND make you want to watch it. This is the gold standard for topic identity: a viewer who has never seen the title knows this is about black holes AND feels compelled to click. Lesson: when the image IS the topic identifier (accretion disk = black hole, SR-71 = fighter jet, eruption column = volcano), the hook is free to focus purely on emotion because the image handles the 'what is this about?' question on its own.",
  },
];

const losers = [
  {
    outputDir: '/opt/videoforge/output/v3-hard4/blue-whale',
    reason: "Image was much better this time (close-up whale face with visible eye = clear subject). But 'ORGANS GO DARK' doesn't connect to the video's actual hook which is SCALE — a heart bigger than a car, a heart you could climb inside. 'ORGANS GO DARK' sounds like death/disease, not size/wonder. The video is about how impossibly HUGE the whale's heart is. The hook must connect to the video's actual premise (scale/size), not generic biology. Lesson: the hook must reflect what the VIDEO is actually about, not just create a mood that matches the image. 'ORGANS GO DARK' is a great hook for a dying-whale video, but this is a size-wonder video.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard4/blindfolded',
    reason: "The video is about walking in circles blindfolded, but there's NO BLINDFOLD in the image and 'LEGS BETRAY YOU' doesn't communicate the bizarre circular-walking phenomenon. The cracked desert is atmospheric but doesn't tell the story. This needed the KEY VISUAL ELEMENT of the video: a person wearing a blindfold, ideally with a visible circular walking pattern. When the video title contains a specific visual element (blindfolded), that element MUST appear in the thumbnail image or the viewer can't identify the topic. The visual IS the hook for this topic.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard4/typo-war',
    reason: "The video is about a $30 BILLION TYPO that STARTED A WAR. The thumbnail shows a tired guy at a screen with '19 HOURS AWAKE'. The hook completely abandoned the actual story — '19 HOURS AWAKE' has nothing to do with a typo or a war. This is the clearest example of the system losing the thread of the video topic. The metaphor brainstorm went down an 'exhausted person' path instead of a 'catastrophic tiny mistake with huge consequences' path. A single mistyped character causing billions in damage and triggering a war is the actual hook — the thumbnail must make THAT feel dramatic, not the tiredness of the person who typed it.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard4/last-speaker',
    reason: "NEAR-WINNER. 'NO ONE ANSWERS' is emotionally devastating and the elderly woman writing is powerful. But without the video title, this could be about grief, loneliness, missing persons — anything. The viewer needs ONE signal that this is about LANGUAGE. Even just the woman's mouth being the focal point, or her speaking into empty space, or visible text/writing being the central element, would connect 'NO ONE ANSWERS' to communication/language instead of general sadness. The thumbnail is beautiful but could be for the wrong video — that's worse than ugly-but-accurate.",
  },
];

console.log('Pool BEFORE: winners=' + loadWinners().length + ' losers=' + loadLosers().length);
for (const v of winners) {
  try {
    const r = approveFromCli(v);
    console.log('  ✓ ' + v.outputDir.split('/').pop() + ' → winners=' + r.pool_size);
  } catch (e) {
    console.log('  ! ' + v.outputDir.split('/').pop() + ' FAILED: ' + e.message);
  }
}
for (const v of losers) {
  try {
    const r = rejectFromCli(v);
    console.log('  + ' + v.outputDir.split('/').pop() + ' → losers=' + r.pool_size);
  } catch (e) {
    console.log('  ! ' + v.outputDir.split('/').pop() + ' FAILED: ' + e.message);
  }
}
console.log('Pool AFTER:  winners=' + loadWinners().length + ' losers=' + loadLosers().length);
