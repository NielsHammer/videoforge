import axios from "axios";
import fs from "fs";
import path from "path";
import ora from "ora";
import chalk from "chalk";

/**
 * Generate a professional YouTube script optimized for faceless channels.
 * Produces conversational, human-sounding narration with proper video structure.
 */
export async function generateScript(topic, options = {}) {
  const duration = options.duration || "8-10";
  const style = options.style || "educational";
  const outputDir = options.output || "./scripts";
  
  fs.mkdirSync(outputDir, { recursive: true });

  const spinner = ora(`Writing script about "${topic}"...`).start();

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `You are a top YouTube scriptwriter for faceless channels that get millions of views. Write a ${duration} minute narration script about:

"${topic}"

TONE: ${style}
${style === "humor" ? "Use witty observations, unexpected comparisons, and comedic timing. Be funny but still informative." : ""}
${style === "serious" ? "Be authoritative and data-driven. Use precise language and expert tone." : ""}
${style === "dramatic" ? "Build tension and suspense. Use cliffhangers and dramatic reveals." : ""}
${style === "engaging" ? "Be conversational and energetic. Mix facts with relatable examples." : ""}

STRUCTURE (critical for retention):
1. HOOK (first 5-8 seconds — THIS IS THE MOST IMPORTANT PART):
   The first 3 sentences must create a RAPID-FIRE visual barrage. Each sentence becomes its own visual clip.
   
   Sentence 1: A SHOCKING NUMBER. Start with the most jaw-dropping statistic.
   Example: "Ninety-five percent of people will never retire comfortably."
   
   Sentence 2: A COMPARISON or CONTEXT that makes the number hit harder.
   Example: "That means only five out of every hundred people you know will have enough money to stop working."
   
   Sentence 3: THE PROMISE — what the viewer will learn.
   Example: "But there are exactly four steps that separate the five percent from everyone else."
   
   NEVER start with just a vague statement. ALWAYS lead with a specific number.
   
2. PATTERN INTERRUPT (every 60-90 seconds): Ask a question, introduce a twist, or shift angle.
3. SECTION BREAKS: Use 3-5 numbered sections. These become visual title cards.
4. SUBSCRIBE CTA (at ~40% mark): Natural integration. "If this is clicking, hit subscribe."
5. OPEN LOOPS before sections: "But here's where it gets wild..."
6. STRONG CLOSE: Key takeaway + forward-looking statement.

VISUAL-FRIENDLY WRITING (this is critical — the script feeds an automated video system):
Your script will be paired with infographic animations. Write to CREATE opportunities for visuals:

- Include SPECIFIC NUMBERS frequently (percentages, dollar amounts, stats, measurements).
  Good: "Your cortisol drops by thirty-eight percent within the first week."
  Bad: "Your stress levels decrease significantly."

- Include COMPARISONS between 2+ things with real data.
  Good: "The average American spends two hundred forty minutes on their phone daily compared to just twenty-two minutes exercising."
  Bad: "People spend too much time on phones."

- Include LISTS of 3-5 items when explaining concepts.
  Good: "Three things happen to your liver: first, fat deposits shrink by fifteen percent. Second, enzyme levels normalize. Third, inflammation markers drop in half."
  Bad: "Your liver starts getting healthier."

- Include TIMELINE/PROGRESSION moments.
  Good: "At twelve hours, your blood sugar stabilizes. By day three, cravings peak. At two weeks, your taste buds actually reset."
  Bad: "Over time your body adjusts."

- Include RANKING or SCALE references.
  Good: "The top five hidden sugar sources are: yogurt at twenty-six grams, granola bars at eighteen, pasta sauce at twelve, salad dressing at eight, and bread at six per serving."
  Bad: "Many foods contain hidden sugar."

VOICE & TONE:
- Write like talking to a smart friend over coffee
- Use contractions: "you'd", "that's", "wouldn't"
- Short sentences mixed with longer ones for rhythm
- Rhetorical questions: "So what does this actually mean?"
- Specific numbers and examples — NEVER vague
- No filler: remove "actually", "basically", "you know"
- No AI clichés: never say "dive into", "landscape", "game-changer", "let's unpack"
- Spell out ALL numbers as words (write "thirty-eight percent" not "38%")
- This will be read by text-to-speech, so write phonetically

FORMAT:
- Write ONLY narration text, no stage directions or [brackets]
- Blank lines between paragraphs (natural pauses)
- Numbered sections: "Number one. SECTION TITLE." on its own line
- Target ${duration} minutes at ~150 words per minute

Write the complete script now.`,
        },
      ],
    },
    {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
    }
  );

  const script = response.data.content[0].text.trim();
  const wordCount = script.split(/\s+/).length;
  const estMinutes = (wordCount / 150).toFixed(1);

  // Generate filename from topic
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  const outputPath = path.join(outputDir, `${slug}.txt`);
  
  fs.writeFileSync(outputPath, script);
  spinner.succeed(`Script written: ${outputPath}`);
  
  console.log(chalk.white(`📝 Words: ${wordCount}`));
  console.log(chalk.white(`⏱️  Est. duration: ${estMinutes} minutes`));
  console.log(chalk.white(`📁 Saved: ${outputPath}`));
  
  // Show first 3 lines as preview
  const preview = script.split("\n").filter(l => l.trim()).slice(0, 3);
  console.log(chalk.gray(`\n  "${preview[0]}"`));
  if (preview[1]) console.log(chalk.gray(`  "${preview[1]}"`));
  
  return { path: outputPath, wordCount, estMinutes };
}
