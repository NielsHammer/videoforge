#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import { generateVideo } from './pipeline.js';
import { generateScript } from './script-generator.js';

const program = new Command();

program
  .name('videoforge')
  .description('Script-to-video pipeline for Tube Accelerator')
  .version('1.0.0');

program
  .command('script')
  .alias('write')
  .description('Generate a YouTube script from a topic')
  .argument('<topic>', 'Topic or title for the video')
  .option('-d, --duration <minutes>', 'Target duration in minutes', '8-10')
  .option('-s, --style <style>', 'Script style: educational, storytelling, listicle', 'educational')
  .option('-o, --output <dir>', 'Output directory', './scripts')
  .action(async (topic, options) => {
    console.log(chalk.blue.bold('\n✍️  VideoForge Script Generator\n'));
    try {
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
  .option('-v, --voice <voice>', 'ElevenLabs voice ID or name', 'S9GPGBaMND8XWwwzxQXp')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('--no-ai-clips', 'Skip AI-generated clips, use only stock footage')
  .option('--no-music', 'Skip background music')
  .option('--skip-voice', 'Reuse existing voiceover files')
  .option('--voice-only', 'Generate voiceover only, skip visuals and render')
  .option('--theme <template>', 'Visual template')
  .action(async (scriptPath, options) => {
    console.log(chalk.blue.bold('\n🎬 VideoForge v19\n'));
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
    console.log(chalk.yellow('Scene redo not yet implemented — coming in Session 3'));
  });

program
  .command('voices')
  .description('List available ElevenLabs voices')
  .action(async () => {
    const { listVoices } = await import('./elevenlabs.js');
    await listVoices();
  });

program.parse();
