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

STRUCTURE (this is critical for retention):
1. HOOK (first 5 seconds): Start with a shocking stat, bold claim, or provocative question. NO "hey guys" or "welcome to my channel". Jump straight into the hook. Example: "A single dollar invested in 1970 would be worth forty-three thousand today."
2. PATTERN INTERRUPT (every 60-90 seconds): Shift energy. Ask a question, introduce a twist, or change topic angle.
3. SECTION BREAKS: Use 4-6 numbered sections/tips/steps. These become visual title cards.
4. SUBSCRIBE CTA (at ~40% mark): Work it naturally into the content. "If this is clicking for you, hit subscribe — most viewers aren't subscribed yet."
5. OPEN LOOP before each section: Tease what's coming. "But here's where it gets interesting..."
6. STRONG CLOSE: Recap the key insight, end with a forward-looking statement or call to action.

VOICE & TONE:
- Write like you're talking to a smart friend over coffee
- Use contractions: "you'd", "that's", "wouldn't", "here's"
- Short sentences mixed with longer ones for rhythm
- Rhetorical questions: "So what does this actually mean for you?"
- Specific numbers and examples — never vague
- No filler phrases: remove "actually", "basically", "you know", "to be honest"
- No AI clichés: never say "dive into", "landscape", "game-changer", "let's unpack"
- Spell out numbers as words (write "two hundred sixty thousand" not "260,000")
- This will be read by text-to-speech, so write phonetically where needed

FORMAT:
- Write ONLY the narration text, no stage directions or [brackets]
- Use blank lines between paragraphs (these become natural pauses)
- Start numbered sections with the format: "Number one. SECTION TITLE." on its own line
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
