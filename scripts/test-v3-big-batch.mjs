/**
 * BIG BATCH — 20 thumbnails across diverse niches.
 *
 * Pool: 29W+54L. All recent fixes in place:
 *   - Hook brainstormer: clarity/promise/emotion scoring
 *   - Statement vs emotion guidance + 4-part test
 *   - Image directive as REQUIRED, not suggestion
 *   - Setting in image when load-bearing
 *   - Source routing: dramatic moments → AI
 *
 * Topics span: history, science, nature, space, psychology,
 * engineering, geography, crime, medicine, economics
 */
import { generateThumbnailV3 } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';

const topics = [
  {
    slug: 'pompeii-bread',
    title: "The 2,000-Year-Old Loaf of Bread Found Perfectly Preserved in Pompeii",
    niche: 'history',
    tone: 'wonder',
    scriptText: `In the ruins of Pompeii, archaeologists found a loaf of bread that had been baked on the morning of August 24, 79 AD — the day Mount Vesuvius erupted. The bread was carbonized by the volcanic heat but perfectly preserved in shape, complete with the baker's stamp and scoring marks on top. You can still see the individual sections where someone would have torn off pieces. The baker, whose name was Modestus, had his oven still loaded with 81 loaves when the eruption hit. The bread is now in the Naples Archaeological Museum. It looks exactly like bread you'd buy today — round, scored into 8 wedges, about 8 inches across. Two thousand years of human civilization, and we still make bread the same way.`
  },
  {
    slug: 'mariana-sound',
    title: "The Unexplained Sound Recorded at the Bottom of the Mariana Trench",
    niche: 'science',
    tone: 'mystery',
    scriptText: `In 2014, oceanographers deployed a hydrophone to the bottom of the Mariana Trench — the deepest point on Earth, nearly 7 miles below the surface. For 23 days, it recorded. Among the expected sounds of earthquakes and whale calls, they captured something no one could explain: a complex 3.5-second sound with frequencies ranging from 38 Hz to 8,000 Hz, featuring five distinct components including metallic-sounding moans and a biological-sounding finale. Scientists named it the "Western Pacific Biotwang." The sound was recorded multiple times across different seasons, suggesting it's not random. The leading theory is that it's a new type of baleen whale call, but no known whale produces anything like it. At 36,000 feet deep, in perpetual darkness and crushing pressure, something is making a sound we've never heard before.`
  },
  {
    slug: 'haber-paradox',
    title: "The Man Who Saved a Billion Lives and Killed Millions — Fritz Haber",
    niche: 'history',
    tone: 'moral complexity',
    scriptText: `Fritz Haber is the most morally complicated scientist who ever lived. In 1909, he invented a process to pull nitrogen from the air and turn it into fertilizer. This single invention is responsible for feeding roughly half the people alive today — without the Haber process, the Earth could only sustain about 4 billion people. He won the Nobel Prize for it. But Haber was also the father of chemical warfare. During World War I, he personally directed the first large-scale chlorine gas attack at Ypres, Belgium, which killed 5,000 soldiers in minutes. His wife, Clara, begged him to stop. The night he returned home celebrating the attack's success, she shot herself with his military pistol. Haber went back to the front the next morning. His team later developed Zyklon A, the precursor to Zyklon B — the gas used in Holocaust chambers. Haber himself was Jewish and was forced to flee Germany in 1933. He died in exile, heartbroken, having created both a miracle and a horror.`
  },
  {
    slug: 'door-to-hell',
    title: "The Door to Hell — A Crater That Has Been Burning for 50 Years",
    niche: 'geography',
    tone: 'awe',
    scriptText: `In 1971, Soviet geologists were drilling for natural gas in the Karakum Desert of Turkmenistan when the ground collapsed beneath their equipment, creating a massive crater 230 feet wide and 65 feet deep. Fearing that poisonous methane gas would spread to nearby villages, they decided to set it on fire, expecting it would burn off in a few weeks. That was over 50 years ago. The fire has never stopped. The Darvaza Gas Crater — known as the "Door to Hell" — burns 24 hours a day, its orange flames visible for miles across the flat desert. At night, it looks like a portal to the underworld. The crater has become one of the most surreal tourist destinations on Earth, with visitors camping at the edge to watch the flames. Turkmenistan's president has repeatedly ordered it sealed, but no one has figured out how to close it.`
  },
  {
    slug: 'stanford-prison',
    title: "The Stanford Prison Experiment — When Good People Turned Evil in 6 Days",
    niche: 'psychology',
    tone: 'disturbing',
    scriptText: `In 1971, psychologist Philip Zimbardo recruited 24 mentally healthy college students and randomly assigned them to be either "guards" or "prisoners" in a mock prison built in Stanford's basement. The experiment was supposed to last two weeks. It was shut down after six days. Within 36 hours, the guards began psychologically torturing the prisoners — forcing them to do push-ups, stripping them naked, putting bags over their heads, and waking them at 2 AM for "counts." One prisoner had a breakdown so severe he had to be released after 36 hours. The guards weren't told to be cruel — they chose it. Even Zimbardo himself got so absorbed in his role as "superintendent" that he didn't intervene until his girlfriend visited and was horrified by what she saw. The experiment demonstrated how quickly ordinary people can become cruel when given power and permission.`
  },
  {
    slug: 'lake-nyos',
    title: "The Lake That Killed 1,700 People in a Single Night Without Warning",
    niche: 'nature',
    tone: 'horror',
    scriptText: `On August 21, 1986, a massive cloud of carbon dioxide erupted from Lake Nyos in Cameroon. The gas — heavier than air — rolled silently down the surrounding valleys at 60 mph, displacing all oxygen in its path. Within hours, 1,746 people were dead. They didn't drown. They didn't burn. They simply suffocated in their sleep as an invisible cloud settled over their villages. Survivors woke to find everyone around them dead — their families, their neighbors, their livestock. Over 3,500 cattle were killed. The lake had been accumulating CO2 from volcanic activity beneath it for centuries, building up a massive pocket of dissolved gas. When the pocket finally destabilized, it released 1.6 million tons of CO2 in a single eruption. The lake literally exploded. Today, scientists have installed degassing pipes to slowly release the CO2, but other lakes in the region remain ticking time bombs.`
  },
  {
    slug: 'voyager-pale-blue-dot',
    title: "Voyager Turned Around and Took One Last Photo of Earth — The Pale Blue Dot",
    niche: 'space',
    tone: 'profound',
    scriptText: `On February 14, 1990, as Voyager 1 was sailing past Neptune on its way out of the solar system, Carl Sagan convinced NASA to turn the camera around and take one final photograph of Earth. From 3.7 billion miles away, Earth appears as a tiny speck — less than a single pixel — suspended in a beam of sunlight. Sagan wrote: "Look again at that dot. That's here. That's home. That's us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives." The photo nearly didn't happen — NASA was reluctant because the sun could damage the camera, and there was no scientific value. Sagan lobbied for six years. The resulting image became one of the most famous photographs in human history. Everything that has ever happened in human civilization happened on that pale blue dot.`
  },
  {
    slug: 'bridge-of-death',
    title: "The Bridge Where 600 Dogs Have Jumped to Their Deaths",
    niche: 'mystery',
    tone: 'eerie',
    scriptText: `Overtoun Bridge near Dumbarton, Scotland, is a 19th-century stone bridge where an estimated 600 dogs have inexplicably jumped to their deaths since the 1950s. The dogs always jump from the same side of the bridge, between the same two parapets, and almost always on clear, sunny days. Some dogs that survive the 50-foot fall have been observed climbing back up and jumping again. No one knows why. Theories include ultrasonic sounds from the gorge below, the scent of mink that nest in the underbrush, and even supernatural explanations — the bridge was built near Overtoun House, which has its own history of tragedy. Animal behaviorists have studied the phenomenon for decades without a definitive answer. The bridge now has warning signs for dog owners. The pattern is so consistent that locals call it "the bridge of death."`
  },
  {
    slug: 'tree-of-tenere',
    title: "The Most Isolated Tree on Earth Was Hit by a Drunk Driver",
    niche: 'nature',
    tone: 'absurd tragedy',
    scriptText: `The Tree of Ténéré was a solitary acacia tree in the Sahara Desert of Niger, considered the most isolated tree on Earth. The nearest other tree was over 250 miles away. It survived for centuries as a landmark for caravan routes, its roots reaching 110 feet deep to tap into the water table. It appeared on maps as the only tree for hundreds of miles. In 1973, a reportedly drunk Libyan truck driver managed to crash into it — the only tree in 250 miles of empty desert. The dead tree was removed and placed in the Niger National Museum, and a metal sculpture was erected in its place. The tree's well, which sustained it for centuries, still exists and is still used by travelers today.`
  },
  {
    slug: 'dancing-plague',
    title: "The Dancing Plague of 1518 — When Hundreds of People Danced Until They Died",
    niche: 'history',
    tone: 'bizarre',
    scriptText: `In July 1518, a woman named Frau Troffea stepped into the streets of Strasbourg and began dancing. She didn't stop. She danced for days without rest. Within a week, 34 other people had joined her. Within a month, approximately 400 people were dancing uncontrollably in the streets. City officials, believing that more dancing would cure the affliction, built a stage and hired musicians. People danced until they collapsed from exhaustion, strokes, and heart attacks. Several died. Historical records confirm this happened — it's documented in physician notes, cathedral sermons, and city council records. Modern theories include ergot poisoning (a hallucinogenic fungus that grows on grain), mass psychogenic illness triggered by extreme stress, or a cultural belief that the wrath of Saint Vitus could cause uncontrollable dancing. No definitive explanation exists.`
  },
  {
    slug: 'zone-of-silence',
    title: "Mexico's Zone of Silence — Where Radio Signals Disappear",
    niche: 'mystery',
    tone: 'eerie',
    scriptText: `In the Chihuahuan Desert of northern Mexico, there is a patch of desert roughly 50 kilometers across where radio signals, TV signals, and shortwave transmissions reportedly cannot be received. The Zone of Silence came to international attention in 1970 when a US military test rocket launched from White Sands went off course and crashed directly into the zone. When the US military sent a team to recover the rocket, they discovered that their radio equipment didn't work in the area. Mexican researchers later found that the zone sits at the same latitude as the Bermuda Triangle and the Egyptian pyramids. The area is also a biological anomaly — it hosts endemic species found nowhere else, including a unique purple cactus and a tortoise that exists only within the zone's boundaries. Meteorite strikes in the area occur at a rate far higher than surrounding regions.`
  },
  {
    slug: 'rat-king',
    title: "Rat Kings — When Dozens of Rats Fuse Together Into One Horrifying Mass",
    niche: 'nature',
    tone: 'horror',
    scriptText: `A rat king is a phenomenon where a group of rats become tangled together by their tails, fused by blood, dirt, and feces into a single writhing mass. Historical specimens have been found with as many as 32 rats joined together. The earliest recorded rat king dates to 1564 in Germany. Several preserved specimens exist in museums, including one at the Mauritianum Museum in Altenburg with 32 rats. For centuries, rat kings were considered omens of plague. Modern biologists confirm they are real but extremely rare. The rats likely become entangled when confined in tight spaces with sticky substances — their tails knot, then the knots tighten as the rats pull in different directions, and eventually blood, pus, and callused skin fuse the knots permanently. The rats can survive for extended periods because individuals on the outside of the mass can still forage and bring food back. They move as a single horrifying unit.`
  },
  {
    slug: 'silent-twins',
    title: "The Silent Twins — Two Sisters Who Only Spoke to Each Other for 30 Years",
    niche: 'psychology',
    tone: 'haunting',
    scriptText: `June and Jennifer Gibbons were identical twins born in Wales in 1963. From early childhood, they refused to speak to anyone except each other. They developed their own secret language and moved in eerie synchronization — walking in lockstep, finishing each other's gestures. When separated at school, they each became catatonic. Together, they wrote novels, committed a spree of arson and theft, and were committed to Broadmoor, Britain's most notorious psychiatric hospital, where they spent 11 years. During their time at Broadmoor, they made a pact: one of them had to die so the other could live a normal life. Jennifer agreed to be the sacrifice. On the day they were transferred to a lower-security facility in 1993, Jennifer suddenly died of acute myocarditis — inflammation of the heart — with no drugs, no poison, and no explanation. June began speaking normally after Jennifer's death and lives a quiet life today.`
  },
  {
    slug: 'centralia-fire',
    title: "The Town That Has Been on Fire Underground for 60 Years — Centralia, PA",
    niche: 'geography',
    tone: 'dread',
    scriptText: `In 1962, workers in Centralia, Pennsylvania accidentally ignited an exposed coal seam in an abandoned mine while burning trash in the town dump. The fire spread into the labyrinth of mines beneath the town and has been burning ever since. The underground fire covers an area of about 400 acres and burns at temperatures up to 1,000°F. Smoke and toxic gases seep through cracks in the earth. Roads buckle from the heat. In 1981, a 12-year-old boy nearly died when a sinkhole opened beneath him, revealing a 150-foot-deep pit of burning coal and carbon monoxide. The government evacuated most residents and condemned the town. Today, Centralia is a ghost town — cracked roads leading to empty lots, steam rising from the ground, and "Danger" signs marking areas where the earth could collapse. The fire has enough fuel to burn for another 250 years.`
  },
  {
    slug: 'bloop',
    title: "The Bloop — The Loudest Unexplained Sound Ever Recorded in the Ocean",
    niche: 'science',
    tone: 'mystery',
    scriptText: `In 1997, NOAA's hydrophone array — designed to detect submarine activity — picked up an ultra-low-frequency sound so powerful it was detected by sensors over 3,000 miles apart. They named it "the Bloop." The sound lasted about one minute and was several times louder than the loudest known animal, the blue whale. Its frequency profile resembled a living creature, leading to widespread speculation about an undiscovered deep-sea animal of enormous size. For 15 years, the Bloop remained unexplained. In 2012, NOAA concluded it was consistent with an "icequake" — the cracking and calving of a large iceberg. But the debate continues because the sound's biological profile doesn't perfectly match ice activity, and the source location in the remote South Pacific is far from major ice shelves. Some oceanographers maintain the question isn't fully settled.`
  },
  {
    slug: 'human-eli5',
    title: "You Replace Every Atom in Your Body Every 7 Years — So Are You Still You?",
    niche: 'philosophy',
    tone: 'mind-bending',
    scriptText: `Every atom in your body is replaced over roughly a 7-10 year cycle. Your stomach lining replaces itself every 5 days. Your skin every 2-3 weeks. Your red blood cells every 4 months. Your skeleton every 10 years. The atoms that make up your body right now are not the same atoms that made up your body a decade ago — they've been recycled through food, water, and air. You are literally made of different stuff than you were. This raises the Ship of Theseus problem: if every component is replaced, is it still the same ship? Are you still YOU? Your memories feel continuous, but the physical brain storing them has been entirely rebuilt. Some neuroscientists argue that identity is a pattern, not a substance — you are the arrangement, not the atoms. Others argue that certain neurons in the cortex are never replaced, making them the true "you." The question has no scientific answer. It's one of the oldest problems in philosophy, and your body performs it automatically every decade.`
  },
  {
    slug: 'nazi-gold-train',
    title: "The Nazi Gold Train That Disappeared Into a Mountain and Was Never Found",
    niche: 'history',
    tone: 'mystery',
    scriptText: `In January 1945, as Soviet forces closed in on Breslau (now Wrocław, Poland), a German military train loaded with gold, jewels, and looted artwork was reportedly driven into a tunnel complex beneath Książ Castle in Lower Silesia — and never came out. The Nazis had spent years constructing a massive underground complex called Project Riese, consisting of seven underground structures connected by tunnels beneath the Owl Mountains. The train was allegedly part of the last-ditch effort to hide stolen treasures before the war ended. In 2015, two men claimed to have found the train using ground-penetrating radar, triggering a media frenzy and a government-sanctioned excavation. They found nothing. But historians note that Project Riese is only partially explored — miles of tunnels remain sealed. Polish authorities estimate that only about 10% of the underground complex has been mapped. The train, if it exists, could be behind any of dozens of collapsed tunnel sections.`
  },
  {
    slug: 'cotard-delusion',
    title: "Walking Corpse Syndrome — The People Who Believe They Are Already Dead",
    niche: 'psychology',
    tone: 'disturbing',
    scriptText: `Cotard's delusion is a rare neurological condition in which a person genuinely believes they are dead, do not exist, or have lost their blood or internal organs. Patients have been documented refusing to eat because "dead people don't need food," asking to be taken to a morgue, and reporting that they can smell their own flesh rotting. One patient believed she had no brain, no nerves, no stomach — that she was just skin covering emptiness. The condition was first described by Jules Cotard in 1880 after treating a woman who believed she had "no brain, no nerves, no chest, no stomach, no intestines" and that she was "nothing more than a decomposing body." Brain scans of patients show dramatically reduced activity in the areas responsible for face recognition and emotional processing — the brain literally cannot recognize itself as alive. The condition can occur after severe depression, brain injury, or certain neurological diseases. Some patients recover completely with treatment. Others remain convinced of their own death for years.`
  },
  {
    slug: 'seed-vault',
    title: "The Doomsday Vault — Humanity's Backup Plan Hidden Inside a Mountain",
    niche: 'science',
    tone: 'awe',
    scriptText: `Deep inside a mountain on a remote Norwegian island 800 miles from the North Pole, there is a vault containing over 1.2 million seed samples from almost every country on Earth. The Svalbard Global Seed Vault was built to survive any global catastrophe — nuclear war, asteroid impact, pandemic, climate collapse. The vault is buried 400 feet inside solid rock, at the end of a 430-foot tunnel, behind multiple blast-proof doors. The permafrost and thick rock ensure the seeds remain frozen even if the power fails. It has already been used once in earnest: in 2015, seeds were withdrawn to replace a gene bank destroyed by the Syrian civil war. The vault contains no weapons, no gold, no data. Just seeds. The idea is simple: if civilization collapses, someone can walk into this mountain and restart agriculture. The vault is designed to last 1,000 years.`
  },
  {
    slug: 'tarrare',
    title: "The Man Who Could Eat Anything — Tarrare's Impossible Appetite",
    niche: 'history',
    tone: 'grotesque',
    scriptText: `Tarrare was an 18th-century French showman and soldier with an appetite that defied medical explanation. He could eat a meal intended for 15 soldiers in a single sitting. He ate live cats, dogs, lizards, and snakes whole. He swallowed eels without chewing. The French military tried to use him as a spy by having him swallow documents in a metal tube, but he was captured and beaten. Surgeons who examined him found that his body was always hot to the touch, that he sweated profusely and smelled terrible from 20 paces, and that his stomach could be felt through his abdominal wall, distended and soft. His jaws could open wide enough to hold 12 eggs. Despite eating constantly, he remained thin. When he died at 26, the autopsy revealed that his stomach and intestines occupied most of his body cavity, his gullet was so wide you could see directly into his stomach, and his liver and gallbladder were abnormally large. No definitive diagnosis has ever been made.`
  }
];

const BATCH_DIR = '/opt/videoforge/output/v3-big-batch';
fs.mkdirSync(BATCH_DIR, { recursive: true });

const results = [];

for (const t of topics) {
  const outDir = path.join(BATCH_DIR, t.slug);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`\n${'═'.repeat(60)}\n  ${t.slug.toUpperCase()} (${results.length + 1}/20)\n${'═'.repeat(60)}`);
  try {
    await generateThumbnailV3({
      title: t.title,
      scriptText: t.scriptText,
      niche: t.niche,
      tone: t.tone,
      outputDir: outDir
    });
    const plan = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-plan.json'), 'utf-8'));
    const review = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-review.json'), 'utf-8'));
    const hookData = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-hook.json'), 'utf-8'));
    const attempts = fs.readdirSync(outDir).filter(f => f.startsWith('attempt-')).length + 1;

    const entry = {
      slug: t.slug, title: t.title,
      hook: plan.hook_text, critic_score: review.rating, attempts,
      what_is_interesting: hookData.what_is_interesting,
      likely_image: hookData.likely_image,
      status: (review.rating || 0) >= 7 ? 'PASSED' : 'FAILED'
    };
    results.push(entry);
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(entry, null, 2));
    console.log(`  Hook: ${entry.hook} | Critic: ${entry.critic_score}/10 | Attempts: ${attempts} | ${entry.status}`);
  } catch (e) {
    console.error(`  ERROR: ${e.message}`);
    results.push({ slug: t.slug, title: t.title, hook: '???', critic_score: 0, attempts: 0, status: 'ERROR' });
  }
}

// Summary
const passed = results.filter(r => r.status === 'PASSED').length;
const avgScore = results.filter(r => r.critic_score > 0).reduce((sum, r) => sum + r.critic_score, 0) / results.filter(r => r.critic_score > 0).length;
console.log(`\n${'═'.repeat(60)}`);
console.log(`  SUMMARY: ${passed}/${results.length} passed | avg ${avgScore.toFixed(1)}/10`);
console.log(`${'═'.repeat(60)}`);
for (const r of results) {
  console.log(`  ${r.status === 'PASSED' ? '✓' : '✗'} ${r.slug}: "${r.hook}" ${r.critic_score}/10 (${r.attempts} attempts)`);
}

fs.writeFileSync(path.join(BATCH_DIR, 'batch-summary.json'), JSON.stringify(results, null, 2));
console.log('\n\nDone. Check output/v3-big-batch/');
