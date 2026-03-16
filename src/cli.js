#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import { generateVideo } from './pipeline.js';
import { generateScript } from './script-generator.js';

const program = new Command();

program
  .name('videoforge')
  .description('Script-to-video pipeline for Tube Accelerator')
  .version('23.0.0');

program
  .command('script')
  .alias('write')
  .description('Generate a YouTube script from a topic')
  .argument('<topic>', 'Topic or title for the video')
  .option('-d, --duration <minutes>', 'Target duration in minutes', '3')
  .option('-t, --tone <tone>', 'Script tone: engaging, humor, serious, dramatic', 'engaging')
  .option('-m, --mode <mode>', 'Script mode: infographic or visual (auto-detected if not set)')
  .option('-o, --output <dir>', 'Output directory', './scripts')
  .option('--extras-file <path>', 'Path to JSON file with keyPoints and/or ctaText')
  .action(async (topic, options) => {
    console.log(chalk.blue.bold('\n✍️  VideoForge Script Generator v30\n'));
    try {
      // Load key_points and cta_text from sidecar JSON if worker provided one.
      // We use a file instead of CLI args to avoid shell-escaping issues with
      // multi-line text or special characters from customer order forms.
      if (options.extrasFile) {
        try {
          const extras = JSON.parse(fs.readFileSync(options.extrasFile, 'utf8'));
          if (extras.keyPoints) options.keyPoints = extras.keyPoints;
          if (extras.ctaText)   options.ctaText   = extras.ctaText;
          console.log(chalk.cyan(`📎 Extras loaded: ${Object.keys(extras).join(', ')}`));
        } catch (e) {
          console.warn(chalk.yellow(`  ⚠️  Could not load extras file: ${e.message}`));
        }
      }
      await generateScript(topic, options);
    } catch (err) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      if (process.env.DEBUG) console.error(err.stack);
      process.exit(1);
    }
  });

program
  .command('generate')
  .alias('make')
  .description('Generate a video from a script file')
  .argument('<script>', 'Path to the script text file')
  .option('-v, --voice <voice>', 'ElevenLabs voice ID or name')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('--order-id <id>', 'Order ID — used as output folder name for isolation')
  .option('--topic <topic>', 'Original topic from the order form — used for theme detection and thumbnail')
  .option('--no-render', 'Skip video render — only generate thumbnail (used for thumbnail regen)')
  .option('--no-ai-clips', 'Skip AI-generated clips, use only stock footage')
  .option('--no-music', 'Skip background music')
  .option('--skip-voice', 'Reuse existing voiceover files')
  .option('--voice-only', 'Generate voiceover only, skip visuals and render')
  .option('--theme <template>', 'Visual template')
  .option('--brief-file <path>', 'Path to order brief JSON (written by worker)')
  .option('--niche <niche>', 'Channel niche: finance, business, health, travel, horror, general')
  .option('--tone <tone>', 'Tone override: engaging, serious, dramatic, motivational')
  .option('--key-points <text>', 'Key points or angles to cover')
  .option('--cta <text>', 'Call to action text')
  .action(async (scriptPath, options) => {
    console.log(chalk.blue.bold('\n🎬 VideoForge v23\n'));
    try {
      await generateVideo(scriptPath, options);
    } catch (err) {
      console.error(chalk.red(`\n❌ Error: ${err.message}`));
      if (process.env.DEBUG) console.error(err.stack);
      process.exit(1);
    }
  });

program
  .command('redo')
  .description('Re-generate a specific scene')
  .argument('<project>', 'Path to project output folder')
  .option('-s, --scene <number>', 'Scene number to redo')
  .option('--type <type>', 'Visual type: stock, ai, motion', 'stock')
  .action(async (projectPath, options) => {
    console.log(chalk.yellow('Scene redo not yet implemented'));
  });

program
  .command('voices')
  .description('List available ElevenLabs voices')
  .action(async () => {
    const { listVoices } = await import('./elevenlabs.js');
    await listVoices();
  });

program.parse();
