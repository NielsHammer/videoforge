/**
 * Hard batch #10 — 2 remakes + 3 new fresh topics.
 *
 * ROOT CAUSE FIX: Brainstormer now has statement-vs-emotion guidance.
 * "NO OTHER DOCTOR" = statement (tells a fact). "HAD TO BE HIS OWN" = emotion (feel desperation).
 * 4-part test: curious + clickable + emotional + understand topic. All 4 must be true.
 *
 * Remakes:
 *   - Molasses flood: image was incredible, "ENCASED IN SYRUP" failed (syrup = breakfast)
 *   - Self-surgery: Antarctica visible, "NO OTHER DOCTOR" failed (statement not emotion)
 *
 * New topics:
 *   - The Dyatlov Pass incident — 9 hikers died in the Urals, still unexplained
 *   - The Aral Sea — 4th largest lake vanished in one generation
 *   - The Wow! Signal — 72-second radio burst from space, never repeated
 *
 * Pool is 24W+54L.
 */
import { generateThumbnailV3 } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';

const topics = [
  {
    slug: 'molasses-flood',
    title: "Boston's Great Molasses Flood — A 35 MPH Wave That Crushed Everything",
    niche: 'history',
    tone: 'bizarre',
    scriptText: `On January 15, 1919, a massive storage tank in Boston's North End burst open, releasing 2.3 million gallons of molasses in a wave that reached 25 feet high and moved at 35 mph through the streets. The force was enough to crush buildings, bend railroad tracks, and sweep people into the harbor. 21 people were killed and 150 were injured. The molasses was so thick and heavy that rescue workers couldn't pull victims free — people were found encased in hardened molasses days later. The tank had been filled to capacity because the company wanted to distill as much rum as possible before Prohibition took effect. Boston residents claim you can still smell molasses on hot summer days in the North End, over 100 years later.`
  },
  {
    slug: 'self-surgery',
    title: "The Surgeon Who Removed His Own Appendix in Antarctica",
    niche: 'history',
    tone: 'tense',
    scriptText: `In 1961, Dr. Leonid Rogozov was the only physician at a Soviet Antarctic research station. When his appendix became inflamed, there was no one else who could operate. In a desperate act of self-preservation, he performed an appendectomy on himself using local anesthetic, a mirror, and the help of two non-medical assistants who held a mirror and handed him instruments. The surgery took 1 hour and 45 minutes. He made the first incision into his own abdomen while fully conscious, working mostly by touch because the mirror kept fogging and reversing his movements. At several points he nearly lost consciousness from pain. He completed the surgery successfully and was back at work two weeks later. He was the only doctor for thousands of miles in every direction, surrounded by nothing but Antarctic ice.`
  },
  {
    slug: 'dyatlov-pass',
    title: "The Dyatlov Pass Incident — 9 Hikers Died and Nobody Knows Why",
    niche: 'mystery',
    tone: 'dread',
    scriptText: `In February 1959, nine experienced hikers set out on a skiing expedition in the northern Ural Mountains of Russia. They never returned. When search parties found their tent weeks later, it had been cut open from the inside. The hikers had fled into -30°C temperatures wearing almost nothing — some were barefoot in the snow. Their bodies were found scattered across the mountainside over the following months. Some had massive internal injuries with no external wounds. One was missing her tongue. One had third-degree burns. Their clothing was found to be radioactive. The Soviet investigation concluded they died from a "compelling natural force" and closed the case. The pass was named after the group's leader, Igor Dyatlov. To this day, no explanation has been universally accepted. Theories range from avalanche to military testing to infrasound-induced panic.`
  },
  {
    slug: 'aral-sea',
    title: "The Aral Sea — How the World's 4th Largest Lake Vanished",
    niche: 'geography',
    tone: 'tragedy',
    scriptText: `The Aral Sea was once the fourth largest lake in the world, covering 68,000 square kilometers — roughly the size of Ireland. Starting in the 1960s, the Soviet Union diverted its two feeder rivers to irrigate cotton fields in the desert. Within one generation, the lake began to disappear. By 2014, the eastern basin was completely dry for the first time in 600 years. Fishing villages that once sat on the shore are now 150 kilometers from the nearest water. Rusting ships sit in the middle of a desert that was once a seabed. The exposed lakebed releases toxic dust storms that cause respiratory disease and cancer in nearby populations. The salt concentration in the remaining water is so high that almost nothing can survive in it. What took nature millions of years to create, humans destroyed in 50.`
  },
  {
    slug: 'wow-signal',
    title: "The Wow! Signal — A 72-Second Message From Space That Never Repeated",
    niche: 'space',
    tone: 'wonder',
    scriptText: `On August 15, 1977, astronomer Jerry Ehman was reviewing data from Ohio State University's Big Ear radio telescope when he spotted an anomalous signal. It was so remarkable that he circled it on the printout and wrote "Wow!" in the margin. The signal lasted exactly 72 seconds — the maximum duration the telescope could observe a point in the sky as the Earth rotated. It came from the direction of the constellation Sagittarius, about 120 light-years away. The signal was 30 times stronger than background noise and matched the hydrogen frequency — the exact frequency scientists had predicted an intelligent civilization would use to announce its presence. Despite hundreds of subsequent searches of the same region, the signal has never been detected again. It remains the strongest candidate for an alien radio transmission ever recorded. Ehman himself was cautious, saying "I don't think it's ET, but I also can't explain what it is."`
  }
];

const BATCH_DIR = '/opt/videoforge/output/v3-hard10';
fs.mkdirSync(BATCH_DIR, { recursive: true });

for (const t of topics) {
  const outDir = path.join(BATCH_DIR, t.slug);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`\n${'═'.repeat(60)}\n  ${t.slug.toUpperCase()}\n${'═'.repeat(60)}`);
  try {
    const result = await generateThumbnailV3({
      title: t.title,
      scriptText: t.scriptText,
      niche: t.niche,
      tone: t.tone,
      outputDir: outDir
    });
    // result is a png path string, read data from saved JSONs
    const planPath = path.join(outDir, 'thumbnail-v3-plan.json');
    const reviewPath = path.join(outDir, 'thumbnail-v3-review.json');
    const hookPath = path.join(outDir, 'thumbnail-v3-hook.json');
    const plan = fs.existsSync(planPath) ? JSON.parse(fs.readFileSync(planPath, 'utf-8')) : {};
    const review = fs.existsSync(reviewPath) ? JSON.parse(fs.readFileSync(reviewPath, 'utf-8')) : {};
    const hookData = fs.existsSync(hookPath) ? JSON.parse(fs.readFileSync(hookPath, 'utf-8')) : {};
    const attempts = fs.readdirSync(outDir).filter(f => f.startsWith('attempt-')).length + 1;

    console.log(`  Hook: ${plan.hook_text || '???'}`);
    console.log(`  Critic: ${review.rating ?? '???'}/10`);
    console.log(`  Attempts: ${attempts}`);
    console.log(`  Status: ${(review.rating || 0) >= 7 ? 'PASSED' : 'FAILED'}`);
    console.log(`  What's interesting: ${hookData.what_is_interesting || '???'}`);
    console.log(`  Required image: ${hookData.likely_image || '???'}`);

    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({
      slug: t.slug, title: t.title,
      hook: plan.hook_text,
      critic_score: review.rating,
      attempts,
      what_is_interesting: hookData.what_is_interesting,
      likely_image: hookData.likely_image,
      status: (review.rating || 0) >= 7 ? 'PASSED' : 'FAILED'
    }, null, 2));
  } catch (e) {
    console.error(`  ERROR: ${e.message}`);
  }
}

console.log('\n\nDone. Check output/v3-hard10/');
