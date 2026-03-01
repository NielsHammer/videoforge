# VideoForge Session 4 - Build Plan
## Reference Analysis (Titan Mode - first 60 seconds)

### Visual Techniques Observed:
1. **B&W desaturated cutout people** - NOT color. Grayscale/desaturated filter on all cutout people
2. **Yellow accent circle behind head** - Solid yellow (#f5c542) circle positioned behind person's head
3. **Product/info cards** - Blue rectangles with product image + price/text, positioned beside cutout
4. **Full narration as subtitle** - The ENTIRE script types out at the bottom, italic bold white, synced to voiceover
5. **Layered compositions** - Blurred bg photo + B&W cutout + yellow circle + info card + subtitle = 5 layers simultaneously
6. **Connector lines** - White lines linking person to product/info
7. **Meme/reaction shots** - Fullscreen for exactly 1 second as pattern interrupt
8. **Section titles type out** - "#1" in yellow + title types letter by letter
9. **Text flash transitions** - "HERE'S THE FIX" huge centered text, 0.5-1 sec
10. **Extreme close-up fullscreen** - Macro shots filling entire frame
11. **Vertical TikTok embeds** - Portrait video centered with blurred sides (future feature)
12. **Photo-in-frame with zoom** - Slides in blurry, sharpens (zoom transition)
13. **Light/neutral background** - Not always dark grid. Some scenes use light gray bg
14. **Italic bold text style** - Subtitles are italic + bold + white + slight shadow

### Implementation Priority for v10:
1. ✅ B&W filter on all cutout people (CSS filter: grayscale + slight contrast boost)
2. ✅ Yellow circle accent behind cutout head
3. ✅ Full narration subtitle bar (types out entire script, not keywords)
4. ✅ Faster pacing - clips 2-3 sec each
5. ✅ Better voiceover (use ElevenLabs with SSML-like pauses)
6. ✅ Desaturated layered mode (blurred bg + B&W cutout + yellow circle)
7. ✅ Text flash stays 0.5-1 sec max
8. ✅ Section breaks type out (not just pop in)
9. ✅ Italic bold subtitle style
10. ✅ More fullscreen close-ups in the mix

### Future (Session 5+):
- Video clip embedding (TikTok-style vertical with blurred sides)
- Product/info cards with connector lines
- Background music + audio sync
- Meme/reaction clip library
- Batch processing
- Web UI
