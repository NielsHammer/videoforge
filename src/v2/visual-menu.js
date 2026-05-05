/**
 * Visual menu — the full catalog of visual treatments the v2 planner can
 * choose from, with exact schemas and principle-based usage notes.
 *
 * This is NOT a rules list. It's the menu a human designer chooses from.
 * The planner is expected to reason from principle about which treatment
 * serves each specific moment, and to never pick a "default."
 *
 * Every entry documents:
 *   - type          : the visual_type string the renderer expects
 *   - render_field  : where the data goes on the clip (animation_data, chart_data, or image-based)
 *   - schema        : the exact data shape the Remotion component reads
 *   - use_when      : one-sentence principle for when to choose this
 */

export const VISUAL_MENU = {
  // ─────────────── IMAGE-BASED (with display_style) ───────────────
  ai_image_framed: {
    type: 'ai_image',
    display_style: 'framed',
    render_field: 'image',
    schema: { ai_prompt: 'detailed 40-70 word image prompt for this scene' },
    use_when: 'Classic rectangular rounded frame. Use when you want a clean, neutral presentation that lets the image breathe.',
  },
  ai_image_polaroid: {
    type: 'ai_image',
    display_style: 'framed',
    render_field: 'image',
    frame_variant: 'polaroid_tilted',
    schema: { ai_prompt: 'detailed 40-70 word image prompt for this scene' },
    use_when: 'Nostalgic, personal, memory moments — "my first trade", "that day in 2019", "I remember when". White polaroid frame, slightly tilted.',
  },
  ai_image_circular: {
    type: 'ai_image',
    display_style: 'framed',
    render_field: 'image',
    frame_variant: 'circular',
    schema: { ai_prompt: 'detailed 40-70 word image prompt for this scene' },
    use_when: 'Portrait or single-subject focus. Round crop with accent ring glow — hero treatment for one face, one object.',
  },
  ai_image_magazine: {
    type: 'ai_image',
    display_style: 'framed',
    render_field: 'image',
    frame_variant: 'magazine',
    schema: { ai_prompt: 'detailed 40-70 word image prompt for this scene' },
    use_when: 'Editorial full-bleed with corner accent bars. Use for atmospheric establishing shots — wide landscapes, cityscapes, sweeping moments.',
  },
  ai_image_vintage_film: {
    type: 'ai_image',
    display_style: 'framed',
    render_field: 'image',
    frame_variant: 'vintage_film',
    schema: { ai_prompt: 'detailed 40-70 word image prompt for this scene' },
    use_when: 'Historical or nostalgic moments. Sepia-toned film-strip aesthetic with grain and vignette. Great for "back in the 1990s" / "the old days" / flashback scenes.',
  },
  ai_image_hero_centered: {
    type: 'ai_image',
    display_style: 'framed',
    render_field: 'image',
    frame_variant: 'hero_centered',
    schema: { ai_prompt: 'detailed 40-70 word image prompt for this scene' },
    use_when: 'Dramatic hero moment — a square crop with heavy vignette and glow border. Use once per video MAX for the biggest emotional beat.',
  },
  ai_image_split_diagonal: {
    type: 'ai_image',
    display_style: 'framed',
    render_field: 'image',
    frame_variant: 'split_diagonal',
    schema: { ai_prompt: 'detailed 40-70 word image prompt for this scene' },
    use_when: 'Transition or reveal moment. Diagonal mask animates in from the left with an accent line — great for "here\'s what happened next" or a section break.',
  },
  ai_image_fullscreen: {
    type: 'ai_image',
    display_style: 'fullscreen',
    render_field: 'image',
    schema: { ai_prompt: 'detailed 40-70 word image prompt for this scene' },
    use_when: 'Scene is atmospheric, sweeping, or needs maximum impact. Edge-to-edge, no frame.',
  },
  ai_image_fullscreen_zoom: {
    type: 'ai_image',
    display_style: 'fullscreen_zoom',
    render_field: 'image',
    schema: { ai_prompt: 'detailed 40-70 word image prompt for this scene' },
    use_when: 'Scene is reverent, slow, or needs weight. A slow Ken-Burns zoom over 3-5 seconds.',
  },
  // Split with a STAT panel on the opposite side
  ai_image_split_left_stat: {
    type: 'ai_image',
    display_style: 'split_left',
    render_field: 'image',
    panel: 'stat',
    schema: {
      ai_prompt: 'detailed 40-70 word image prompt for this scene',
      panel_stat: { value: '9,000', label: '4-word label max' },
    },
    use_when: 'Image pairs with one specific number that makes the moment land. Image on LEFT, big stat on right.',
  },
  ai_image_split_right_stat: {
    type: 'ai_image',
    display_style: 'split_right',
    render_field: 'image',
    panel: 'stat',
    schema: {
      ai_prompt: 'detailed 40-70 word image prompt for this scene',
      panel_stat: { value: '9,000', label: '4-word label max' },
    },
    use_when: 'Same as split_left_stat but reverse composition. Image on RIGHT, big stat on left. Alternate with split_left_stat to break symmetry.',
  },
  // Split with a SECONDARY IMAGE on the opposite side
  ai_image_split_left_twin: {
    type: 'ai_image',
    display_style: 'split_left',
    render_field: 'image',
    panel: 'multi_image',
    multi_image: 2,
    schema: {
      ai_prompt: 'main prompt for LEFT panel (hero image)',
      search_queries: ['main left image query', 'secondary right image query'],
    },
    use_when: 'Two related images — the primary subject on left, a supporting image (context, reaction, consequence) on right.',
  },
  ai_image_split_right_twin: {
    type: 'ai_image',
    display_style: 'split_right',
    render_field: 'image',
    panel: 'multi_image',
    multi_image: 2,
    schema: {
      ai_prompt: 'main prompt for RIGHT panel (hero image)',
      search_queries: ['secondary left image query', 'main right image query'],
    },
    use_when: 'Same as split_left_twin but reverse. Main image on RIGHT, secondary on left.',
  },
  // Split with an ICON / emoji on the opposite side
  ai_image_split_left_icon: {
    type: 'ai_image',
    display_style: 'split_left',
    render_field: 'image',
    panel: 'icon',
    schema: {
      ai_prompt: 'detailed 40-70 word image prompt for this scene',
      panel_icon: '📍',
    },
    use_when: 'Image plus a single iconic symbol — a flag, a location pin, a warning, a reaction emoji.',
  },
  stock_framed: {
    type: 'stock',
    display_style: 'framed',
    render_field: 'image',
    schema: { search_query: 'specific scene the camera would capture, 6-10 words' },
    use_when: 'A real place/person/object exists that photographs should show — subject must actually exist on the web.',
  },
  stock_fullscreen: {
    type: 'stock',
    display_style: 'fullscreen',
    render_field: 'image',
    schema: { search_query: 'specific scene 6-10 words' },
    use_when: 'Real-world atmospheric shot (landscape, location, crowd) that should fill the frame.',
  },
  stock_brand_screenshot: {
    type: 'stock',
    display_style: 'framed',
    render_field: 'image',
    schema: { search_query: 'exact brand + "homepage" / "landing page" / "dashboard" — e.g. "Fiverr homepage screenshot"' },
    use_when: 'Use when narration mentions a real brand NOT covered by a hand-coded mockup component. If the mockup exists (youtube_dashboard, chatgpt_chat, fiverr_gig, etc.), use that instead — it always looks cleaner.',
  },
  web_screenshot: {
    type: 'web_screenshot',
    display_style: 'framed',
    render_field: 'web_screenshot',
    schema: { brand_or_url: 'brand name (e.g. "shopify") or full URL (e.g. "https://shopify.com/dashboard")' },
    use_when: 'The real ultimate fallback for brand mentions: a live screenshot of the actual site taken by a headless browser. Use when (a) no hand-coded mockup exists and (b) showing the real homepage/dashboard would serve the scene. Prefer hand-coded mockups first.',
  },
  stock_real_person: {
    type: 'stock',
    display_style: 'framed',
    render_field: 'image',
    schema: { search_query: 'specific named person + context — e.g. "MrBeast YouTube 2023"' },
    use_when: 'MANDATORY when narration names a specific real public figure — celebrity, founder, politician, athlete, creator. Never AI-generate real people; it looks uncanny and is legally risky.',
  },
  stock_real_place: {
    type: 'stock',
    display_style: 'framed',
    render_field: 'image',
    schema: { search_query: 'specific named location — e.g. "Google headquarters Mountain View exterior"' },
    use_when: 'MANDATORY when narration names a specific real place, building, landmark — even if you COULD AI-generate it, a real photo is always more credible. Stock beats AI for real places.',
  },

  // ─────────────── MULTI-IMAGE LAYOUTS ───────────────
  polaroid_stack: {
    type: 'polaroid_stack',
    render_field: 'animation_data',
    multi_image: 3,
    schema: {
      data: { captions: ['caption 1', 'caption 2', 'caption 3'] },
      search_queries: ['query1', 'query2', 'query3'],
    },
    use_when: 'Three distinct things coexisting — cast of characters, three related places, three artifacts, three moments. This is the "3 pop-up screens" look.',
  },
  side_by_side_image: {
    type: 'side_by_side',
    render_field: 'animation_data',
    multi_image: 2,
    schema: {
      data: { left_label: 'label under left image', right_label: 'label under right image' },
      search_queries: ['query1', 'query2'],
    },
    use_when: 'Two people, two places, two objects that need to be seen simultaneously — a pair that matters.',
  },

  // ─────────────── STAT / NUMBER ANIMATIONS (animation_data) ───────────────
  spotlight_stat: {
    type: 'spotlight_stat',
    render_field: 'animation_data',
    schema: { value: '9,000', label: '4 word label max', context: 'short context <40 chars' },
    use_when: 'One dramatic number that deserves a full beat — a body count, a price tag, a scale. Use sparingly, max 1-2 per video.',
  },
  big_number: {
    type: 'big_number',
    render_field: 'animation_data',
    schema: { value: '9000', label: 'label', context: 'optional context', prefix: 'optional', suffix: 'optional' },
    use_when: 'A raw number that is the whole point of the moment — bigger than spotlight_stat, no surrounding content.',
  },
  count_up: {
    type: 'count_up',
    render_field: 'animation_data',
    schema: { value: 9000, prefix: '', suffix: '', label: 'Fu-Go balloons launched', duration: 2.5, decimals: 0 },
    use_when: 'A number that should accumulate on screen — a count rising, a counter climbing. Better than spotlight_stat when the magnitude feels earned by watching it build.',
  },
  percent_fill: {
    type: 'percent_fill',
    render_field: 'animation_data',
    schema: { percentage: 96, label: '<4 word label', context: 'optional <40 char', style: 'circle | bar | liquid' },
    use_when: 'A percentage you want to feel physically — how much of a thing, how rare, how common. Only use when narration says a percentage.',
  },

  // ─────────────── COMPARISON (animation_data) ───────────────
  before_after: {
    type: 'before_after',
    render_field: 'animation_data',
    schema: { before: '$2,000/mo', after: '$12,000/mo', label: 'income transformation' },
    use_when: 'Two states of the same thing — before vs after, previous vs now, expected vs actual. The narration has to deliver both values.',
  },
  compare_reveal: {
    type: 'compare_reveal',
    render_field: 'animation_data',
    schema: { title: 'optional', items: [{ label: 'Option A', value: '...' }, { label: 'Option B', value: '...' }], winner: 0 },
    use_when: 'Two options facing off where one is the answer — use winner index to reveal which. Great for myth vs fact.',
  },
  stat_comparison: {
    type: 'stat_comparison',
    render_field: 'animation_data',
    schema: { left: { value: '96%', label: 'never reach $1M', color: '#ef4444' }, right: { value: '4%', label: 'achieve wealth', color: '#22c55e' }, title: 'optional' },
    use_when: 'Two contrasting stats together — the gap between groups, the imbalance of outcomes.',
  },

  // ─────────────── LISTS / BUILD-UPS (animation_data) ───────────────
  checkmark_build: {
    type: 'checkmark_build',
    render_field: 'animation_data',
    schema: { title: 'optional title', items: ['item 1', 'item 2', 'item 3'] },
    max_items: 5,
    use_when: 'A list building up one by one — names, ingredients, steps. Items appear in sequence with checkmarks. Max 5.',
  },
  bullet_list: {
    type: 'bullet_list',
    render_field: 'animation_data',
    schema: { title: 'optional', items: ['point 1', 'point 2', 'point 3'], icon: 'optional ▶' },
    use_when: 'A simple list where order matters but no checking motion. Max 5 items typically.',
  },
  three_points: {
    type: 'three_points',
    render_field: 'animation_data',
    schema: { title: 'optional', points: ['point 1', 'point 2', 'point 3'] },
    use_when: 'Three equal elements shown together — a framework, a trio of reasons. Deliberate rule-of-three.',
  },

  // ─────────────── SCREEN / UI MOCKUPS (animation_data) ───────────────
  // These render clean, readable UI mockups — use these INSTEAD of asking
  // Flux to generate a "screen with text" which always comes out as gibberish.
  tweet_card: {
    type: 'tweet_card',
    render_field: 'animation_data',
    schema: { handle: '@username', name: 'Real Name', text: 'exact tweet text (short)', likes: '1.2K', retweets: '340' },
    use_when: 'Narration references a tweet, a specific short quote in social-media form, or a public statement that reads like one. Grounded text only.',
  },
  reddit_post: {
    type: 'reddit_post',
    render_field: 'animation_data',
    schema: { subreddit: 'r/productivity', username: 'u/anon', title: 'post title', upvotes: '12.4K', comments: '847' },
    use_when: 'A forum-style anonymous account being quoted — user stories, confessions, questions. Grounded text only.',
  },
  youtube_card: {
    type: 'youtube_card',
    render_field: 'animation_data',
    schema: { title: 'real video title', channel: 'real channel name', views: '4.2M views', duration: '14:32', badge: 'optional' },
    use_when: 'Narration references a specific YouTube video or channel. This renders a clean YouTube card — much better than AI-generating a fake YouTube interface.',
  },
  google_search: {
    type: 'google_search',
    render_field: 'animation_data',
    schema: { query: 'exact search query', results: 'array of 3-4 fake result entries' },
    use_when: 'Narration mentions searching for something online or a curiosity gap a viewer would google.',
  },
  instagram_post: {
    type: 'instagram_post',
    render_field: 'animation_data',
    schema: { username: '@handle', caption: 'short caption text', likes: '24.3K', verified: true },
    use_when: 'Social proof / Instagram reference. Grounded text only.',
  },
  phone_screen: {
    type: 'phone_screen',
    render_field: 'animation_data',
    schema: { app: 'instagram | tiktok | twitter | messages | generic', stats: 'array', notification: '', title: '' },
    use_when: 'A phone notification, app screen, or mobile UI moment. Always looks clean vs AI-generated phone screens which look broken.',
  },

  // ─────────────── BRANDED MOCKUPS (animation_data) ───────────────
  // ALWAYS prefer these over an ai_image when the narration mentions the
  // specific brand. AI cannot render readable UIs — these look real and clean.
  youtube_dashboard: {
    type: 'youtube_dashboard',
    render_field: 'animation_data',
    schema: { subscribers: '42.3K', subscribers_delta: '+847', views: '1.2M', views_period: 'Last 28 days', watch_hours: '184K', top_video: 'video title' },
    use_when: 'Narration mentions checking YouTube Studio, subscriber count, view analytics, channel stats, creator dashboard.',
  },
  youtube_channel_page: {
    type: 'youtube_channel_page',
    render_field: 'animation_data',
    schema: { channel_name: 'MrBeast', handle: '@MrBeast', subscribers: '280M', videos: [{ title: 'video title', views: '24M views', age: '3 days ago', duration: '8:42' }] },
    use_when: 'Narration points at a specific YouTube channel, its uploads, or someone browsing a creator\'s public profile.',
  },
  youtube_video_page: {
    type: 'youtube_video_page',
    render_field: 'animation_data',
    schema: { title: 'exact video title', channel: 'channel name', views: '1.2M views', likes: '42K', upload_date: '2 weeks ago', top_comment: { user: 'handle', text: 'comment text' } },
    use_when: 'Narration references watching a specific YouTube video or a video going viral.',
  },
  youtube_comments: {
    type: 'youtube_comments',
    render_field: 'animation_data',
    schema: { video_title: 'optional', comments: [{ user: 'handle', text: 'comment text from narration', likes: '2.1K', time: '1 day ago' }] },
    use_when: 'Narration quotes or summarizes a specific YouTube comment thread.',
  },
  elevenlabs_voices: {
    type: 'elevenlabs_voices',
    render_field: 'animation_data',
    schema: { voices: [{ name: 'Rachel', description: 'calm narrator', language: 'English' }] },
    use_when: 'Narration mentions ElevenLabs, AI voiceovers, picking a voice, or voice cloning.',
  },
  chatgpt_chat: {
    type: 'chatgpt_chat',
    render_field: 'animation_data',
    schema: { messages: [{ role: 'user', text: 'prompt text from narration' }, { role: 'assistant', text: 'response text' }] },
    use_when: 'Narration references asking ChatGPT, an AI prompt, or an AI conversation. NEVER use ai_image for this.',
  },
  fiverr_gig: {
    type: 'fiverr_gig',
    render_field: 'animation_data',
    schema: { seller_name: 'sarah_designs', seller_level: 'Top Rated', title: 'design a youtube thumbnail', rating: '5.0', reviews: '2,347', price: '25', category: 'Graphics & Design' },
    use_when: 'Narration mentions Fiverr, hiring freelancers, gig listings, or outsourcing creative work.',
  },
  notion_page: {
    type: 'notion_page',
    render_field: 'animation_data',
    schema: { title: 'page title', emoji: '📝', blocks: [{ type: 'heading', text: '...' }, { type: 'bullet', text: '...' }, { type: 'todo', text: '...', checked: false }, { type: 'callout', text: '...' }, { type: 'text', text: '...' }] },
    use_when: 'Narration mentions note-taking, documentation, project planning, Notion, or an organized knowledge base.',
  },
  canva_editor: {
    type: 'canva_editor',
    render_field: 'animation_data',
    schema: { design_title: 'project name', template_name: 'YouTube Thumbnail', canvas_text: 'THE HEADLINE THE NARRATION DESCRIBES', accent_color: '#00c4cc' },
    use_when: 'Narration mentions designing graphics, Canva, thumbnails, social media visuals.',
  },
  google_docs: {
    type: 'google_docs',
    render_field: 'animation_data',
    schema: { doc_title: 'filename', heading: 'doc heading', paragraphs: ['paragraph 1 from narration', 'paragraph 2'] },
    use_when: 'Narration mentions writing, drafting, Google Docs, collaborative documents, a written document being created.',
  },
  gmail_inbox: {
    type: 'gmail_inbox',
    render_field: 'animation_data',
    schema: { emails: [{ sender: 'Sender Name', subject: 'subject line', preview: 'preview text', time: '10:42 AM', unread: true }] },
    use_when: 'Narration references email, an inbox, a sponsor message, a newsletter arriving.',
  },
  slack_channel: {
    type: 'slack_channel',
    render_field: 'animation_data',
    schema: { workspace: 'Team Name', channel: 'general', messages: [{ user: 'name', text: 'message from narration', time: '10:42' }] },
    use_when: 'Narration references team communication, Slack, a workplace chat, a DM thread.',
  },
  script_typing: {
    type: 'script_typing',
    render_field: 'animation_data',
    schema: { title: 'script.md', lines: ['# Line 1', 'Line 2', 'Line 3'] },
    use_when: 'Narration describes writing a script, drafting content, writing an outline — this renders an animated code-editor style typing effect. All text must be grounded in the narration.',
  },

  // ─────────────── STOCK TRADING / FINANCE (animation_data) ───────────────
  // Use these aggressively for any trading / finance / market narration. They
  // look more credible than AI-generated chart images which always come out as
  // broken gibberish lines.
  forex_pair: {
    type: 'forex_pair',
    render_field: 'animation_data',
    schema: { symbol: 'XAUUSD', name: 'Gold / US Dollar', price: '2847.52', change: '+0.73%', direction: 'up', bid: 'optional', ask: 'optional' },
    use_when: 'Narration names a specific forex / crypto / index pair (EURUSD, XAUUSD, BTCUSD, SPY, etc.). Renders a huge live-price display with directional glow.',
  },
  tradingview_chart: {
    type: 'tradingview_chart',
    render_field: 'animation_data',
    schema: { symbol: 'BTCUSD', timeframe: '4H', price: '67,420', change: '+2.4%', candles: [{ open: 100, close: 108, high: 112, low: 98 }], signal: 'BREAKOUT | ENTRY | EXIT | null' },
    use_when: 'Narration describes a chart, price action, a breakout, a support/resistance, entry/exit signal, or any specific trading setup. Renders a full TradingView-style interface with animated candles and a moving average.',
  },
  pnl_ledger: {
    type: 'pnl_ledger',
    render_field: 'animation_data',
    schema: { trades: [{ symbol: 'SPY', side: 'LONG | SHORT', pnl: '+$1,240', date: 'Jan 14', winning: true }], total_pnl: '+$4,820', win_rate: '68%' },
    use_when: 'Narration discusses a trading track record, win/loss history, multiple trades in sequence, or a P&L summary.',
  },
  // Existing trading-related legacy components — exposing to menu
  candlestick_chart: {
    type: 'candlestick_chart',
    render_field: 'chart_data',
    schema: { title: 'Price Action', candles: [{ open: 100, close: 120, high: 130, low: 90 }], labels: ['optional labels'] },
    use_when: 'A simple candlestick chart without the full TradingView chrome. Use when narration describes price action but doesn\'t name a specific platform interface.',
  },
  stock_ticker: {
    type: 'stock_ticker',
    render_field: 'animation_data',
    schema: { items: [{ symbol: 'AAPL', value: '$182.43', change: '+2.1%', up: true }], title: 'optional', featured: { value: '...', label: '...' } },
    use_when: 'Multiple tickers at once — "the market moved" moments, sector rotation, comparing stocks.',
  },
  money_counter: {
    type: 'money_counter',
    render_field: 'animation_data',
    schema: { amount: 10000, label: 'per month', prefix: '$', duration: 2 },
    use_when: 'A single dollar amount counting up dramatically — revenue, profit, loss, salary, net worth. Animated from 0 to target.',
  },
  trend_arrow: {
    type: 'trend_arrow',
    render_field: 'animation_data',
    schema: { direction: 'up | down', label: '4-word label', value: '+42%', context: 'optional context' },
    use_when: 'A quick up/down trend moment — one value moving in one direction. Smaller than forex_pair.',
  },
  animated_line_chart: {
    type: 'line_chart',
    render_field: 'chart_data',
    schema: { title: 'optional', points: [{ label: '2020', value: 100 }, { label: '2021', value: 140 }], prefix: '$', suffix: '', color: '#4a9eff' },
    use_when: 'A smooth line chart showing a trend — revenue growth, account balance over time, any non-candlestick trend visualization. Points are {label, value} — use real labels (years, months, dates).',
  },
  net_worth_reveal: {
    type: 'net_worth_reveal',
    render_field: 'animation_data',
    schema: { amount: '$400 MILLION', name: 'person or entity name', context: 'one line context' },
    use_when: 'A dramatic net-worth or total-value reveal attached to a named person or entity.',
  },

  // ─────────────── ELEGANT STATEMENT LAYOUTS (animation_data) ───────────────
  // These are for important single-sentence moments. Each one is a distinctive
  // visual treatment that elevates a statement from "line of text" to "moment".
  // Use sparingly — a video should have at most 2-3 statement layouts total.
  handwritten_note: {
    type: 'handwritten_note',
    render_field: 'animation_data',
    schema: { text: 'the line (verbatim from narration)', signature: 'optional attribution' },
    use_when: 'A line that feels like a personal thought, confession, or insight — "I wrote this in my journal", "here\'s what I\'d tell my younger self". Handwritten on cream paper, ink appears letter by letter.',
  },
  spotlight_statement: {
    type: 'spotlight_statement',
    render_field: 'animation_data',
    schema: { text: 'the line (verbatim from narration)', kicker: 'optional small label above' },
    use_when: 'A hero sentence that deserves theater. Warm spotlight opens up from darkness, text appears in a pool of golden light. Cinematic and solemn.',
  },
  stacked_quote: {
    type: 'stacked_quote',
    render_field: 'animation_data',
    schema: { lines: ['line 1', 'line 2', 'line 3'], attribution: 'optional' },
    use_when: 'A multi-line quote or a statement that breaks naturally across 2-4 lines. Oversized decorative quote marks in accent color, lines cascade in.',
  },
  minimal_centered: {
    type: 'minimal_centered',
    render_field: 'animation_data',
    schema: { text: 'the line (verbatim from narration)', accent_word: 'optional — one word to highlight in accent color' },
    use_when: 'Bold, centered, maximum whitespace. The entire screen carries one statement. Elegant minimalism.',
  },
  cinematic_text: {
    type: 'cinematic_text',
    render_field: 'animation_data',
    schema: { text: 'the line (verbatim from narration)', subtext: 'optional secondary line' },
    use_when: 'A prestige-documentary title reveal — serif type, letterbox bars slide in, slow dolly zoom, uppercase. Use for the biggest emotional beat or a chapter break.',
  },
  elegant_accent: {
    type: 'elegant_accent',
    render_field: 'animation_data',
    schema: { text: 'the line (verbatim from narration)', kicker: 'optional small label above', attribution: 'optional' },
    use_when: 'Editorial magazine feel — vertical gold accent bar on the left, elegant serif type on the right. Use for considered statements, not dramatic reveals.',
  },

  // ─────────────── DOCUMENT / NEWS (animation_data) ───────────────
  newspaper_flash: {
    type: 'newspaper_flash',
    render_field: 'animation_data',
    schema: { headline: 'EMPEROR ASSASSINATED', subhead: 'optional', date: 'March 15, 44 BC' },
    use_when: 'A historical moment that landed as "news" — real headline treatment. Works great for dates and shocks.',
  },
  document_reveal: {
    type: 'document_reveal',
    render_field: 'animation_data',
    schema: { title: 'OFFICIAL DOCUMENT', content: 'body text of the document', seal: '✦' },
    use_when: 'An official document, memo, or directive that the narration references. Think declassified.',
  },
  evidence_board: {
    type: 'evidence_board',
    render_field: 'animation_data',
    schema: { title: 'CASE FILE #47', items: [{ label: 'VICTIM', detail: 'John Doe' }] },
    max_items: 4,
    use_when: 'Investigative moment — facts being pinned to a wall. Multiple labeled pieces of evidence.',
  },
  pull_quote: {
    type: 'pull_quote',
    render_field: 'animation_data',
    schema: { quote: '"exact quoted text"', attribution: 'who said it, when' },
    use_when: 'Narration explicitly quotes someone — the exact words matter and the viewer should see them.',
  },

  // ─────────────── VISUAL METAPHOR / GAUGE (animation_data) ───────────────
  gauge_meter: {
    type: 'gauge_meter',
    render_field: 'animation_data',
    schema: { value: 72, max: 100, label: 'Risk Score', unit: '', zones: [{ pct: 33, color: '#22c55e' }, { pct: 66, color: '#eab308' }, { pct: 100, color: '#ef4444' }] },
    use_when: 'A single metric on a scale — risk level, confidence score, satisfaction, danger level. The needle sweeps with physics. Zones can be customized (green/yellow/red is the default).',
  },
  scale_balance: {
    type: 'scale_balance',
    render_field: 'animation_data',
    schema: { left: { label: 'Cost', value: '$4,200' }, right: { label: 'Experience', value: 'Priceless' }, winner: 'left|right|balanced' },
    use_when: 'Weighing two options against each other — cost vs value, risk vs reward, effort vs result. The heavier side tilts down.',
  },
  pyramid_stack: {
    type: 'pyramid_stack',
    render_field: 'animation_data',
    schema: { title: 'optional', layers: [{ label: 'Foundation', detail: 'optional' }, { label: 'Middle', detail: '' }, { label: 'Peak', detail: '' }] },
    use_when: 'A hierarchy — levels of importance, tiers, stages from broad base to narrow peak. Layers build from bottom up.',
  },
  funnel_chart: {
    type: 'funnel_chart_v2',
    render_field: 'animation_data',
    schema: { title: 'optional', stages: [{ label: 'Visitors', value: '100K', pct: 100 }, { label: 'Signups', value: '12K', pct: 12 }, { label: 'Paid', value: '800', pct: 0.8 }] },
    use_when: 'A narrowing process — conversion funnel, drop-off rates, filtering stages. Each bar narrows proportionally.',
  },

  // ─────────────── PRESENTATION CARDS (animation_data) ───────────────
  definition_card: {
    type: 'definition_card',
    render_field: 'animation_data',
    schema: { word: 'Overtourism', phonetic: '/ˌoʊvərˈtʊrɪzəm/', pos: 'noun', definition: 'the main definition text', example: 'optional example sentence' },
    use_when: 'Narration introduces or defines a term — "what is X?", "this is called X", a jargon word being explained. Dictionary-style serif typography.',
  },
  price_tag: {
    type: 'price_tag',
    render_field: 'animation_data',
    schema: { price: '$4,200', was: '$2,000', label: 'hidden cost per week', context: 'optional subtext' },
    use_when: 'A cost, price, or fee being revealed dramatically. Optional strikethrough "was" price for comparison. The number is the whole point of the scene.',
  },
  ranking_list: {
    type: 'ranking_list',
    render_field: 'animation_data',
    schema: { title: 'optional', items: [{ label: 'Tokyo', value: '$4,200', rank: 1 }, { label: 'Paris', value: '$3,800', rank: 2 }] },
    max_items: 7,
    use_when: 'A top-N ranking — most expensive cities, highest-rated items, best/worst of a category. Horizontal bars fill in sequence.',
  },
  comparison_table: {
    type: 'comparison_table',
    render_field: 'animation_data',
    schema: { left_title: 'Budget', right_title: 'Premium', rows: [{ feature: 'Hotel', left: '$30/night', right: '$180/night' }], winner: 'left|right|none' },
    max_rows: 6,
    use_when: 'Side-by-side feature comparison — budget vs premium, plan A vs plan B, this year vs last year. Rows appear one by one.',
  },
  calendar_date: {
    type: 'calendar_date',
    render_field: 'animation_data',
    schema: { month: 'March', day: '15', year: '2024', event: 'the event name', context: 'optional subtext' },
    use_when: 'A specific date that matters — a deadline, a launch date, a historical moment. Calendar page flips in.',
  },
  warning_alert: {
    type: 'warning_alert',
    render_field: 'animation_data',
    schema: { level: 'warning|danger|info', title: 'Hidden Fee Alert', text: 'the detail text', icon: 'optional emoji' },
    use_when: 'A caution, danger, or important notice — scam warnings, hidden fees, things to avoid, red flags. Elegant alert box with slow pulse.',
  },
  review_stars: {
    type: 'review_stars',
    render_field: 'animation_data',
    schema: { rating: 4.5, max: 5, title: 'optional', review: 'optional review text', source: 'TripAdvisor', count: '2,847 reviews' },
    use_when: 'A rating or review being shown — hotel rating, app score, product review. Stars fill in one by one.',
  },

  // ─────────────── JOURNEY / PROGRESS (animation_data) ───────────────
  roadmap_journey: {
    type: 'roadmap_journey',
    render_field: 'animation_data',
    schema: { title: 'optional', steps: [{ label: 'Arrive', icon: 'emoji', detail: 'optional' }, { label: 'Explore', icon: 'emoji' }, { label: 'Return', icon: 'emoji' }], current: 3 },
    use_when: 'A multi-step process or journey — travel itinerary, business roadmap, step-by-step plan. Waypoints light up in sequence along a horizontal path.',
  },
  countdown_timer: {
    type: 'countdown_timer_v2',
    render_field: 'animation_data',
    schema: { from: 10, to: 0, label: 'days until deadline', unit: 'DAYS', context: 'optional' },
    use_when: 'A countdown — days left, attempts remaining, time running out. The number ticks down dramatically.',
  },

  // ─────────────── ENGAGEMENT / SOCIAL PROOF (animation_data) ───────────────
  notification_stack: {
    type: 'notification_stack',
    render_field: 'animation_data',
    schema: { notifications: [{ icon: '💸', title: 'Hidden Fee', text: 'Temple entry: $15', time: 'just now' }] },
    max_items: 5,
    use_when: 'A series of alerts, fees, or events cascading in — hidden costs piling up, notifications arriving, problems stacking. Cards slide in from the right.',
  },

  // ─────────────── TRAVEL / LOCATION (animation_data) ───────────────
  boarding_pass: {
    type: 'boarding_pass',
    render_field: 'animation_data',
    schema: { from: 'SFO', from_city: 'San Francisco', to: 'DPS', to_city: 'Denpasar, Bali', date: 'Mar 15, 2024', flight: 'GA 881', class: 'Economy', gate: 'B12' },
    use_when: 'Travel, journey, or departure moment — booking a flight, starting a trip, going somewhere new. Clean airline ticket aesthetic.',
  },
  passport_stamp: {
    type: 'passport_stamp_v2',
    render_field: 'animation_data',
    schema: { country: 'INDONESIA', city: 'Bali', date: '15 MAR 2024', type: 'ARRIVED', icon: '🇮🇩' },
    use_when: 'Arrival at a destination — entering a country, reaching a milestone, "landing" somewhere new. Stamp punches onto a passport page.',
  },

  // ─────────────── REACTIONS / METAPHOR (animation_data) ───────────────
  reaction_face: {
    type: 'reaction_face',
    render_field: 'animation_data',
    schema: { emoji: '🤯', label: 'Mind = Blown', style: 'bounce' },
    use_when: 'A punchline moment — the surprise, the absurd, the "wait, what?" Use rarely, only for true gut-punch beats.',
  },
  lightbulb_moment: {
    type: 'lightbulb_moment',
    render_field: 'animation_data',
    schema: { text: 'main insight', subtitle: 'optional elaboration' },
    use_when: 'The scripts delivers a realization — the moment the viewer goes "oh." One per video max.',
  },

  // ─────────────── LOCATION / MAP (animation_data) ───────────────
  map_callout: {
    type: 'map_callout',
    render_field: 'animation_data',
    schema: { location: 'Bly, Oregon', stat: '6', statLabel: 'civilian deaths', subtitle: 'May 5 1945', emoji: '📍' },
    use_when: 'A specific place where something happened — pin-on-map with one stat. Not a full map visualization.',
  },

  // ─────────────── CHARTS (chart_data) ───────────────
  timeline: {
    type: 'timeline',
    render_field: 'chart_data',
    schema: { title: 'optional', events: [{ year: '1944', label: 'first launch' }] },
    max_events: 6,
    use_when: 'A chain of dated events — narration walks through them in order. Horizontal, left-to-right.',
  },
  horizontal_bar: {
    type: 'horizontal_bar',
    render_field: 'chart_data',
    schema: { title: 'optional', items: [{ label: 'US', value: 9000 }], prefix: '', suffix: '' },
    use_when: 'Comparing quantities across categories — countries, groups, products. Items have labeled values.',
  },
  donut_chart: {
    type: 'donut_chart',
    render_field: 'chart_data',
    schema: { title: 'optional', segments: [{ label: 'A', value: 60, color: '#4a9eff' }], centerLabel: 'optional' },
    use_when: 'A whole divided into parts — percentages of a total, breakdown of something.',
  },
  icon_grid: {
    type: 'icon_grid',
    render_field: 'chart_data',
    schema: { title: 'optional', items: [{ label: 'a', icon: '⚓' }] },
    max_items: 6,
    use_when: 'Several things of the same type displayed together with icons — tools, options, factions.',
  },
  map_highlight: {
    type: 'map_highlight',
    render_field: 'chart_data',
    schema: { title: 'optional', highlights: [{ region: 'Oregon', value: '6', suffix: '', label: 'deaths', x: 20, y: 40 }] },
    use_when: 'Geographic visualization with pinned stats — multiple regions highlighted. x/y are % positions on the map area.',
  },
};

/**
 * Compact prompt-ready description of the menu.
 */
export function menuForPrompt() {
  const lines = Object.entries(VISUAL_MENU).map(([key, entry]) => {
    // Surrogate-safe truncation: don't cut a multi-byte emoji in half
    let schemaStr = JSON.stringify(entry.schema);
    if (schemaStr.length > 160) {
      schemaStr = schemaStr.slice(0, 160);
      // If we cut inside a surrogate pair, back up one char
      const last = schemaStr.charCodeAt(schemaStr.length - 1);
      if (last >= 0xD800 && last <= 0xDBFF) schemaStr = schemaStr.slice(0, -1);
      schemaStr += '…';
    }
    return `- **${key}** (type=${entry.type}${entry.display_style ? `, display_style=${entry.display_style}` : ''}) — ${entry.use_when}\n  schema: ${schemaStr}`;
  });
  return lines.join('\n\n');
}

/**
 * List of all menu keys — for strict validation on planner output.
 */
export function getMenuKeys() {
  return Object.keys(VISUAL_MENU);
}

/**
 * Look up an entry by key. Used by the adapter to route data correctly.
 */
export function getMenuEntry(key) {
  return VISUAL_MENU[key] || null;
}
