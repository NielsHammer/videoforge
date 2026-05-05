/**
 * Hard batch #9 — 2 remakes + 3 new fresh topics.
 *
 * Remakes:
 *   - Self-surgery: was very close but missing Antarctica context.
 *     The brainstormer's likely_image prompt now tells it to include
 *     setting when setting is load-bearing.
 *   - Underground city: hook "200,000 BURIED" sounded like mass grave.
 *     Needs hook that captures "city on top of city" not death.
 *
 * New topics (diverse niches, concrete visual subjects):
 *   - Chernobyl's "Elephant's Foot" — the most dangerous object on Earth
 *   - The Great Molasses Flood of 1919 — 2.3M gallons of molasses crushed Boston
 *   - Voyager's Golden Record — humanity's message to aliens, still flying
 *
 * Pool is 22W+51L. "NEVER SEEN RAIN" added as winner example in brainstormer.
 */
import { generateThumbnailV3 } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';

const topics = [
  {
    slug: 'self-surgery',
    title: "The Surgeon Who Removed His Own Appendix in Antarctica",
    niche: 'history',
    tone: 'tense',
    scriptText: `In 1961, Dr. Leonid Rogozov was the only physician at a Soviet Antarctic research station. When his appendix became inflamed, there was no one else who could operate. In a desperate act of self-preservation, he performed an appendectomy on himself using local anesthetic, a mirror, and the help of two non-medical assistants who held a mirror and handed him instruments. The surgery took 1 hour and 45 minutes. He made the first incision into his own abdomen while fully conscious, working mostly by touch because the mirror kept fogging and reversing his movements. At several points he nearly lost consciousness from pain. He completed the surgery successfully and was back at work two weeks later. He was the only doctor for thousands of miles in every direction, surrounded by nothing but Antarctic ice.`
  },
  {
    slug: 'underground-city',
    title: "Mexico City Is Sinking Into Its Own Ancient Past",
    niche: 'geography',
    tone: 'awe',
    scriptText: `Mexico City was built by Spanish conquistadors directly on top of the Aztec capital Tenochtitlan, which itself was built on a lake. The city is now sinking at a rate of up to 50 centimeters per year because it's pumping out the groundwater from the ancient lakebed it sits on. As it sinks, the ruins of Tenochtitlan keep rising to the surface — temples, walls, and artifacts from the Aztec empire emerge during construction projects. The Great Temple was only rediscovered in 1978 when utility workers found a massive stone disc. Underneath modern Mexico City lies an entire civilization's capital, and the modern city is literally collapsing into it. Over 20 million people live on top of a sinking, ancient city that keeps revealing itself.`
  },
  {
    slug: 'elephants-foot',
    title: "The Most Dangerous Object on Earth — Chernobyl's Elephant's Foot",
    niche: 'science',
    tone: 'dread',
    scriptText: `Deep beneath the ruins of Chernobyl Reactor 4, there is a mass of radioactive material called the Elephant's Foot. It formed when the nuclear fuel melted through the reactor floor and mixed with concrete, sand, and other materials to create a lava-like substance called corium. When it was first discovered in 1986, standing near it for 300 seconds would give you a fatal dose of radiation. The photo of the Elephant's Foot — taken by Artur Korneyev using a special camera on a long stick — is one of the most famous images in nuclear history. Korneyev visited it multiple times and developed cataracts from the exposure. The Elephant's Foot is still radioactive today, still sitting in the basement of the reactor, still slowly eating through the concrete beneath it. It will remain dangerous for over 100,000 years.`
  },
  {
    slug: 'molasses-flood',
    title: "Boston's Great Molasses Flood — A 35 MPH Wave of Syrup Crushed Everything",
    niche: 'history',
    tone: 'bizarre',
    scriptText: `On January 15, 1919, a massive storage tank in Boston's North End burst open, releasing 2.3 million gallons of molasses in a wave that reached 25 feet high and moved at 35 mph through the streets. The force was enough to crush buildings, bend railroad tracks, and sweep people into the harbor. 21 people were killed and 150 were injured. The molasses was so thick and heavy that rescue workers couldn't pull victims free — people were found encased in hardened molasses days later. The tank had been filled to capacity because the company wanted to distill as much rum as possible before Prohibition took effect. Boston residents claim you can still smell molasses on hot summer days in the North End, over 100 years later.`
  },
  {
    slug: 'golden-record',
    title: "Voyager's Golden Record — Humanity's Message to Aliens",
    niche: 'space',
    tone: 'wonder',
    scriptText: `In 1977, NASA launched two Voyager spacecraft, each carrying a golden phonograph record containing sounds and images selected to portray the diversity of life on Earth. The record includes greetings in 55 languages, music from Mozart to Chuck Berry, sounds of surf and thunder, and 116 images of Earth and its inhabitants. Carl Sagan chaired the committee that chose the contents. The record also contains the brain waves of Ann Druyan, recorded the night she realized she was in love with Sagan. Both Voyager spacecraft have now left the solar system entirely — Voyager 1 is over 15 billion miles from Earth, the most distant human-made object in existence. The golden record will outlast Earth itself, drifting through interstellar space for billions of years, carrying the sounds of a civilization that may no longer exist when it's finally found.`
  }
];

const BATCH_DIR = '/opt/videoforge/output/v3-hard9';
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
    const plan = result.plan || {};
    console.log(`  Hook: ${result.hookText || plan.hook_text || '???'}`);
    console.log(`  Critic: ${result.criticScore ?? '???'}/10`);
    console.log(`  Attempts: ${result.attempts ?? '?'}`);
    console.log(`  Status: ${result.criticScore >= 7 ? 'PASSED' : 'FAILED'}`);
    if (result.hookData) {
      console.log(`  What's interesting: ${result.hookData.what_is_interesting || '???'}`);
      console.log(`  Required image: ${result.hookData.likely_image || '???'}`);
    }
    // Save summary
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({
      slug: t.slug, title: t.title,
      hook: result.hookText || plan.hook_text,
      critic_score: result.criticScore,
      attempts: result.attempts,
      what_is_interesting: result.hookData?.what_is_interesting,
      likely_image: result.hookData?.likely_image,
      image_prompt: plan.image_prompt,
      source_hint: plan.source_hint,
      status: result.criticScore >= 7 ? 'PASSED' : 'FAILED'
    }, null, 2));
  } catch (e) {
    console.error(`  ERROR: ${e.message}`);
  }
}

console.log('\n\nDone. Check output/v3-hard9/');
