# VideoForge + TubeAutomate — Master Document
**Last updated: March 28, 2026**

---

## What This Is

**TubeAutomate.com** is a done-for-you YouTube video production service. Customers pay $150/video and receive a complete, publish-ready faceless YouTube video delivered to their Google Drive within 24 hours. They believe videos are manually produced — the AI pipeline is invisible to them.

**VideoForge** is the underlying script-to-video AI pipeline that powers TubeAutomate. It takes a topic and order brief, generates a script, voiceover, storyboard, images, and renders a complete 1080p video with subtitles, music, and a thumbnail.

**The vision**: Scale to 300+ videos/month with full automation. Team reviews and approves videos before delivery. Target: under 24 hours turnaround. Long-term: evolve into a SaaS credit system (like InVideo).

---

## Business Model

- **Price**: $150/video
- **Cost per video**: ~$4.35 (ElevenLabs $4.40 fixed ÷ volume, Claude $0.75, Fal.ai $0.95, VPS $0.12)
- **Gross margin**: ~97% at $150/video
- **ElevenLabs plan**: $1,320/month fixed, 11M credits = covers 1,375 videos/month
- **At 300 videos/month**: ElevenLabs costs $4.40/video (fixed cost spread)
- **At 1,375 videos/month**: ElevenLabs drops to $0.96/video
- **Payment processor**: Whop
- **Business partner**: Matt Par (mattpar.com brand)

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js on Vercel (tubeautomate.com) |
| Database | Supabase (fhrznlqtnjgyzpvthyyl.supabase.co, East US) |
| VPS | Hetzner 178.156.209.219, CPX41, Ubuntu 24.04 |
| Process manager | PM2 (videoforge-worker process) |
| Video pipeline | Node.js ES modules at /opt/videoforge/src/ |
| Video rendering | Remotion (1080p 30fps) |
| Voice | ElevenLabs Multilingual v2 (16 voices) |
| AI images | Fal.ai Flux Pro |
| Image search | Brave Image Search (primary), Pexels (fallback) |
| AI director | Anthropic Claude Sonnet |
| Audio | FFmpeg (merge + subtitle burn) |
| Payments | Whop (webhook at tubeautomate.com/api/webhooks/whop) |
| Email | Resend.com via Cloudflare DNS |
| Delivery | Google Drive (service account per client) |

---

## Key File Locations

```
VPS: /opt/videoforge/src/
  pipeline.js       — Main pipeline, craftAIPrompt, image generation
  director.js       — Storyboard generation (Pass 1 + Pass 2)
  worker.js         — Job queue, polls Supabase every 30s
  video-bible.js    — Analyzes full script, produces visual rules
  script-generator.js — Script writing
  elevenlabs.js     — Voiceover + word timestamps
  fal.js            — AI image generation
  remotion/         — React video components

Frontend: C:\Users\niels\tubeautomate\src\app\
  page.tsx          — Landing page (rebuilt March 28 with Matt Par photos)

VPS repos: NielsHammer/videoforge (GitHub)
Frontend repo: NielsHammer/tubeautomate (GitHub, auto-deploys to Vercel)
```

---

## Pipeline Architecture (Current — March 28, 2026)

```
Order placed on TubeAutomate
  → Worker picks up (polls every 30s)
  → Script generator (Claude API, niche-aware)
  → ElevenLabs (voiceover → MP3 + word timestamps)
  → Video Bible (Claude API — analyzes full script, produces visual rules)
  → Director Pass 1 (pre-flight: classifies each clip as stock/animation/infographic)
  → Director Pass 2 (assigns specific visual type + search query per clip)
  → Asset pipeline (Brave search → Pexels fallback → AI generation)
  → craftAIPrompt (Claude API — generates Fal.ai image prompt with full context)
  → Remotion render (React components → silent MP4)
  → FFmpeg merge (video + voiceover + music)
  → ASS subtitle burn (karaoke-style, burned into video)
  → Thumbnail generation (Fal.ai + Puppeteer)
  → Admin review queue
  → Google Drive delivery
```

---

## Video Bible System

Runs once before storyboard. Reads the full script (up to 15,000 chars) and produces:

```json
{
  "era": "modern|historical|ancient|futuristic",
  "era_specific": "exact period e.g. 'Modern USA 2024'",
  "setting": "where this video lives conceptually",
  "visual_tone": "documentary_neutral|bright_energetic|cinematic_dark etc",
  "required_visual_style": "exact description of what images should look like",
  "target_audience": "who watches — age, background, knowledge level",
  "emotional_arc": "emotional journey of the video",
  "banned_visuals": ["things that must never appear"],
  "image_search_prefix": "prefix for all image searches",
  "key_visual_moments": [{"moment": "quote", "visual_description": "...", "search_query": "..."}],
  "preferred_components": ["animation types that fit this video"],
  "infographic_opportunities": [{"moment": "...", "component": "...", "data_hint": "..."}]
}
```

**CRITICAL**: Video bible context (setting, era, audience, arc, banned visuals) flows into EVERY image generation call via craftAIPrompt. This is what makes images contextually correct without niche-specific rules.

---

## craftAIPrompt — How Image Prompts Are Generated

Every AI-generated image goes through craftAIPrompt which receives:
- `videoTopic` — full video title
- `videoBible` — complete visual context (era, setting, audience, arc, banned visuals)
- `narratedSentence` — exact words narrator says at this timestamp (from ElevenLabs word timestamps)
- `sentenceBefore` + `sentenceAfter` — surrounding context for continuity
- `position` — where in video (HOOK / SETUP / MAIN CONTENT / CLIMAX / CONCLUSION)
- `clipIndex` + `totalClips` — for position calculation

Claude then generates a 35-55 word Fal.ai image prompt that:
- Matches the visual world of the video (era, setting, style from bible)
- Shows the SPECIFIC thing the narrator describes right now
- Features real, relatable people — not models
- Uses documentary/candid style
- Respects the target audience

**Philosophy**: Give Claude full context and trust it to reason correctly. No niche regex rules, no era hardcoding. If the video is about ancient Rome the bible says so — Claude generates Roman imagery. If it's about gym exercises the bible says "modern fitness, beginner audience" — Claude generates ordinary people working out.

---

## Director System

### Pass 1 — Pre-flight Classification
- Reads full script + timing
- Classifies each clip as: stock / animation / infographic / split
- Uses video bible to set visual budget per niche
- Chunked at 60 clips for long videos

### Pass 2 — Assignment
- Gets 20 clips at a time
- Assigns specific visual type + search query + animation data
- BANNED TYPES (never assign): kinetic_text, typewriter_reveal, neon_sign, glitch_text, news_breaking, word_scatter, news_headline, bold_claim, text_flash, overlay_caption
- VARIETY RULE: no animation type more than 2 times per chunk
- BEST MATCH RULE: pick the animation that most naturally represents the content

### Post-processing
- Any banned text type → converted to stock automatically
- Max 3 of same animation type per chunk enforced in code
- validateAndSyncClips — syncs timing to ElevenLabs timestamps

### Why Text Animations Are Banned
We have burned-in ASS karaoke subtitles on every video. Text-only animations (typewriter_reveal etc) create double-subtitle effect and add no visual value. COMPLETELY REMOVED from all lists, prompts, fallbacks, and rotation pools.

---

## Subtitle System

- **Format**: ASS (Advanced SubStation Alpha) — not SRT
- **Style**: Karaoke — 4 words per phrase stay on screen, current word highlights yellow
- **Position**: Bottom center, MarginV=120, fixed — never moves
- **Font**: Arial 48px, white text, black outline
- **Burn**: FFmpeg `ass` filter after video merge
- **No flickering**: One phrase line stays visible for its full duration, only the highlight moves

**DO NOT switch back to SRT** — SRT creates one entry per word = flickering every 0.2 seconds.

---

## Image Pipeline (Priority Order)

1. **Brave Image Search** — primary, uses `image_search_prefix` from video bible
2. **Pexels** — fallback if Brave fails (historical videos bypass Pexels entirely)
3. **Fal.ai Flux Pro** — AI generation when no good stock match found
4. **Emergency fallback** — bare prompt if everything else fails

Image style: documentary, photojournalism, candid, real lighting, real people. NOT clickbait, NOT overdone stock photos, NOT fitness models.

---

## Animation Component Library (Remotion)

42+ components built. Key ones:
- spotlight_stat, count_up, percent_fill, trend_arrow
- before_after, compare_reveal, highlight_build, checkmark_build
- reaction_face, lightbulb_moment, rocket_launch, thumbs_up
- bullet_list, step_reveal, myth_fact, pro_con
- big_number, alert_banner, stat_comparison, pull_quote
- timeline, process_flow, leaderboard, ranking_cards
- stock_ticker, tweet_card, phone_screen (creator niche)
- candlestick_chart, roi_calculator, wealth_ladder (finance niche)

---

## Worker System

- Polls Supabase every 30 seconds
- Processes 2 concurrent jobs
- Stuck order check every 30 minutes
- File expiry: 10 days after generation
- **Auto-requeue permanently removed** — failed orders stay failed, no automatic retry
- Failed orders must be manually requeued via Supabase update

---

## Supabase Schema

Tables: `orders`, `profiles`, `credit_logs`

Order statuses: `queued` → `processing` → `review` → `delivered` | `failed`

Key order fields:
- `id`, `user_id`, `topic`, `status`
- `output_path`, `expires_at`
- `retry_count`, `admin_notes`
- `niche`, `tone`, `duration`, `cta`

---

## TubeAutomate Frontend

- **URL**: tubeautomate.com
- **Stack**: Next.js, Vercel (auto-deploys from NielsHammer/tubeautomate)
- **Auth**: Supabase auth + forgot password flow (Resend.com SMTP)
- **Payments**: Whop integration, webhook verified with @whop/sdk
- **Local path**: C:\Users\niels\tubeautomate\

### Key Pages
- `/` — Landing page (Matt Par brand, real photos, dashboard mockups)
- `/dashboard` — Client dashboard (credits, order form, video list)
- `/admin` — Admin panel (review queue, approve/reject, manage clients)
- `/auth/set-password` — Forgot password flow

---

## Google Drive Delivery

- Service account: tubeautomate-drive@tubeautomate-489123.iam.gserviceaccount.com
- Master folder ID: 1IK3-QxxS79tzuHqN6YMKcgZzP2tpQAyy
- Each client gets their own subfolder
- Videos upload automatically after admin approval

---

## Cost Analysis (Current)

| Item | Cost/video at 300/month | Cost/video at 1375/month |
|------|------------------------|--------------------------|
| ElevenLabs (fixed $1,320) | $4.40 | $0.96 |
| Claude API | $0.75 | $0.75 |
| Fal.ai images | $0.95 | $0.95 |
| Brave + VPS | $0.24 | $0.24 |
| **Total** | **$6.34** | **$2.90** |

Revenue at $150/video: $45,000/month at 300 videos. Gross margin ~95-97%.

---

## Critical Rules — NEVER BREAK THESE

### Pipeline
1. **Never include package.json in tar archives** — Remotion ^4.0.0 breaks on reinstall
2. **Always restart PM2 after VPS changes** — `pm2 restart videoforge-worker`
3. **Always commit after VPS changes** — git add -A && git commit && git push
4. **File expiry is 10 days** — `expiresAt = Date.now() + 10 * 24 * 60 * 60 * 1000`
5. **Auto-requeue is permanently disabled** — failed orders never auto-retry

### Director
6. **Text animations are permanently banned** — kinetic_text, typewriter_reveal, neon_sign, glitch_text, news_breaking, word_scatter, news_headline, bold_claim NEVER appear in any list, prompt, fallback, or rotation pool
7. **Subtitles are ASS karaoke** — never switch back to SRT
8. **Subtitle position is fixed** — MarginV=120, never changes between phrases
9. **Image style is documentary** — not clickbait, not fitness models, not luxury stock photos
10. **craftAIPrompt receives full context** — videoBible, position, surrounding sentences, videoTopic always passed

### TubeAutomate
11. **Credit changes always logged** in credit_logs table
12. **Whop webhook uses @whop/sdk** — not manual signature verification
13. **Videos deliver under 24 hours** — never tell customers it's AI

---

## Working Conventions (Niels's Preferences)

- **Full file rewrites only** — never partial patches or diffs
- **Deliver as .tar.gz** with single extraction command
- **One command at a time** — specify PowerShell vs SSH for every command
- **Never give a command you don't want run immediately**
- **Unique filenames** inside archives — never bare `page.tsx`
- **Patch scripts (.mjs)** uploaded via SCP and run directly on VPS
- **Clean patch artifacts from git** after every deployment
- **Always read current state** before making changes — never assume
- **Fix root causes** not symptoms
- **Baby step instructions** — explain what each command does

---

## Environment

- **Windows 11**, PowerShell terminal
- **VPS**: SSH to root@178.156.209.219
- **Local frontend**: C:\Users\niels\tubeautomate\
- **Local videoforge**: Not maintained locally — all changes on VPS directly
- **PowerShell equivalents**: Get-Content (not cat), Select-String (not grep), Get-Content -First/-Last (not head/tail)

---

## Current Status (March 28, 2026)

### Completed Today
- Text animations completely purged from director (0 references to typewriter_reveal/kinetic_text in active code)
- ASS karaoke subtitles implemented and deployed
- craftAIPrompt rewritten with full context (video bible, position, surrounding sentences)
- video-bible.js updated to include target_audience and emotional_arc
- Variety enforcement added to assignment prompt (max 2 of same type per chunk)
- Realistic documentary image rules added
- Era detection made context-driven (video bible) not regex-based
- Batch cleanup of patch artifacts from git

### Pending / In Progress
- Gym video "Top 10 gym exercises" requeued for testing — watching for storyboard variety and image quality
- Whop webhook plan ID verification still needed
- Robert Masterson order investigation pending
- Funmilayo and Bob Beck credit compensation pending

### Known Customer Issues
- **Funmilayo** — 8 videos deleted by old 7-day cleanup. Give credits manually.
- **Bob Beck** — order 3455d149 marked delivered but file gone. Needs manual resolution.

---

## CLAUDE.md (for Claude Code sessions)

When starting a new Claude Code session on this project, tell Claude:

> "You are working on VideoForge + TubeAutomate. Read MASTER_DOC_MARCH28.md first. Key rules: text animations permanently banned, subtitles are ASS karaoke, craftAIPrompt uses full video bible context, never auto-requeue failed orders, never include package.json in archives, always restart PM2 after changes, always commit after changes."