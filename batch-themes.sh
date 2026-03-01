#!/bin/bash
# Generate 30-second samples for all 10 themes
# Uses the same script/voiceover, only re-renders with different themes

SCRIPT="scripts/how-much-money-you-need-to-retire-at-30.txt"
THEMES=("grid" "particles" "topography" "diamond" "radar" "dna" "city" "flames" "ocean" "stars")

echo "🎬 Generating 10 theme samples..."
echo ""

for theme in "${THEMES[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🎨 Theme: $theme"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  node src/cli.js generate "$SCRIPT" --skip-voice --theme "$theme"
  
  # Rename output to include theme name
  OUTDIR="output/2026-02-28-how-much-money-you-need-to-retire-at-30"
  if [ -f "$OUTDIR/final.mp4" ]; then
    cp "$OUTDIR/final.mp4" "$OUTDIR/sample-${theme}.mp4"
    echo "✅ Saved: sample-${theme}.mp4"
  fi
  echo ""
done

echo "🎉 All 10 samples generated!"
echo "📁 Find them in: output/2026-02-28-how-much-money-you-need-to-retire-at-30/"
echo ""
echo "Open all:"
echo "open output/2026-02-28-how-much-money-you-need-to-retire-at-30/sample-*.mp4"
