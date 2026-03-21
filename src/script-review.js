import axios from "axios";
import chalk from "chalk";

// ─── SCRIPT REVIEW PASS ──────────────────────────────────────────────────────
// Runs after script generation. Catches AI clichés, robotic sentences,
// and rewrites them before the script goes to the video pipeline.

export async function reviewAndPolishScript(rawScript, topic, niche, tone) {
  const wordCount = rawScript.split(/\s+/).length;

  const prompt = `You are a script editor for a top YouTube channel. Your job is to make this script sound like a real, passionate human wrote it — not AI.

TOPIC: "${topic}"
NICHE: ${niche || "general"}
TONE: ${tone || "engaging"}

SCRIPT TO REVIEW:
${rawScript}

YOUR TASK:
1. Find every sentence that sounds robotic, corporate, or AI-generated
2. Rewrite those sentences to sound like a real person talking
3. Remove any banned phrases that slipped through
4. Keep all facts, numbers, and structure intact — only improve the voice
5. Keep the word count within 10% of the original (currently ${wordCount} words)

BANNED PHRASES TO ELIMINATE:
"dive into", "delve", "landscape", "game-changer", "let's unpack", "it's worth noting",
"in today's world", "at the end of the day", "make no mistake", "the fact of the matter",
"when it comes to", "in conclusion", "to summarize", "moreover", "furthermore",
"it is important to", "needless to say", "rest assured",
"leverage", "synergy", "paradigm", "holistic", "robust", "seamless",
"cutting-edge", "state-of-the-art", "revolutionary", "groundbreaking",
"fascinating", "interesting", "incredible", "amazing", "unbelievable"

WHAT GOOD SOUNDS LIKE:
- Short punchy sentences mixed with longer flowing ones
- Contractions: "you've", "that's", "it's", "wouldn't", "they'd"
- Direct address: "you", "your", "here's what you need to know"
- Sentence fragments for punch: "Not what you'd expect." "Every single time."
- Admits things: "Here's the part most people get wrong."
- Real rhetorical questions: not "So what does this mean?" but "Why would anyone do that?"

Return ONLY the polished script text — no preamble, no "Here is the revised script:", no commentary.
Just the clean script ready to go straight to voice recording.`;

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        timeout: 180000,
      }
    );

    const polished = response.data.content[0].text.trim();
    const newWordCount = polished.split(/\s+/).length;
    const diff = Math.abs(newWordCount - wordCount);
    const pctDiff = Math.round((diff / wordCount) * 100);

    console.log(chalk.cyan(`  ✏️  Script polished: ${wordCount} → ${newWordCount} words (${pctDiff}% change)`));
    return polished;
  } catch (e) {
    console.log(chalk.yellow(`  ⚠️  Script review failed (${e.message}) — using original`));
    return rawScript;
  }
}
