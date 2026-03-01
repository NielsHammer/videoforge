# Background Music

Drop royalty-free .mp3 files into the mood subfolder that matches your content.

## Folder Structure

- `motivational/` — Uplifting, energetic (health tips, morning routines, success)
- `calm/` — Ambient, relaxing (sleep content, meditation, wind-down)
- `dramatic/` — Dark, tense (warnings, mistakes, dangers)
- `serious/` — Corporate, professional (finance, business, career)
- `curious/` — Documentary, explorative (science, brain, discovery)
- `default/` — Fallback for any mood

## How It Works

VideoForge auto-detects the mood from your script and picks a random track from the matching folder.
If no matching folder has tracks, it tries `default/`, then any folder with tracks.

Music is:
- Looped to match video duration
- Faded in (2s) and out (3s)
- Ducked to ~12% volume under the voiceover
- Mixed into the final video automatically

## Recommended Sources (Royalty-Free)

- Pixabay Music: https://pixabay.com/music/
- Mixkit: https://mixkit.co/free-stock-music/
- YouTube Audio Library: https://studio.youtube.com/channel/UC/music
- FreePD: https://freepd.com/
- Unminus: https://www.unminus.com/

## Tips

- Pick tracks that are 2-4 minutes (they get looped anyway)
- Avoid tracks with prominent vocals — they clash with narration
- Instrumental only works best
- Lower BPM (80-120) works for most content
- Higher BPM (120-140) for energetic/motivational content
- Test with `--no-music` flag to compare with/without

## Usage

```bash
# With music (auto-detected mood)
node src/cli.js generate scripts/my-script.txt

# Without music
node src/cli.js generate scripts/my-script.txt --no-music
```
