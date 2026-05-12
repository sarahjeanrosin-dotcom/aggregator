# Demo Deck Intelligence

A password-protected tool for sales teams to synthesize rep feedback on demo decks using AI. Paste interview transcripts, get an aggregate report with confusion points, objections, company fit patterns, and prioritized fixes — all with estimated rep percentages.

## Features

- 🔒 Password-protected with per-session API key entry
- 📋 Paste transcripts from multiple reps
- 🤖 AI analysis via Claude (Anthropic API)
- 📊 Aggregate report with Full / Condensed toggle
- 📈 Percentage breakdown view showing % of reps who raised each theme
- 📄 Export as PDF or Word (.docx)
- 🙈 Confidential text export with rep names removed

## Getting started

1. Open `index.html` in a browser (or deploy to GitHub Pages)
2. Enter the team password
3. Enter your [Anthropic API key](https://console.anthropic.com) — stays in your browser tab only
4. Paste rep interview transcripts and click **Analyze all interviews**

## Project structure

```
demo-deck-intelligence/
├── index.html   — markup and layout
├── styles.css   — all styling and CSS variables
├── app.js       — all JavaScript: auth, AI calls, rendering, exports
└── README.md
```

## Configuration

Open `app.js` and update the password at the top of the file:

```js
// Change this password before sharing with your team.
const TEAM_PASSWORD = 'deck2025';
```

> **Note:** The password is visible in the source code. This is appropriate for internal tooling shared with trusted teammates, but not for public-facing deployments.

## Deployment

This is a static site — no server required. Deploy anywhere that serves HTML:

- **GitHub Pages:** push to a repo, enable Pages in Settings → Pages
- **Netlify / Vercel:** drag and drop the folder
- **Local:** open `index.html` directly in a browser

## API usage

Each "Analyze all interviews" run makes one API call per rep transcript plus one aggregate call, all using `claude-sonnet-4-5`. Costs are typically a few cents per session depending on transcript length.
