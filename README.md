# My Claude

A static, Claude.ai-style chat client. Every visitor enters their **own** Anthropic API key on first load — the key is verified against Anthropic, then cached in their browser. Chat history is stored per-browser in `localStorage`, so each visitor gets their own private history.

No backend. No server. Just a static site you can host anywhere — including **free on GitHub Pages**.

## Features

- Drop-in **API key setup screen** on first visit, with live verification
- Direct browser → Anthropic API calls (no proxy needed)
- Pick any Claude model your key has access to (Opus / Sonnet / Haiku 4.5, 3.7, 3.5)
- Streaming responses with a Stop button
- Per-chat conversation history with full context
- Sidebar with search, rename, delete, date grouping
- Auto-generated chat titles (via Haiku)
- Image attachments (vision)
- Markdown rendering: GFM tables, code highlighting + copy, KaTeX math
- Light / dark mode, mobile responsive
- Settings menu to change key, clear chats, sign out

## Local development

```bash
cd my-claude
npm install
npm run dev
```

Open <http://localhost:3000>. The setup screen will ask for your `sk-ant-...` key on first visit.

## Deploy to GitHub Pages (recommended)

You get a free public URL like `https://<username>.github.io/<repo-name>/`. Each visitor enters their own API key — **you do not pay for their usage**.

### One-time setup

1. **Create a new GitHub repo** (e.g. `my-claude`) and push this folder to it.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Push to `main`. The included `.github/workflows/deploy.yml` will build and publish automatically.

That's it. Visit `https://<your-username>.github.io/<repo-name>/` once the workflow finishes (check the **Actions** tab).

### If you rename the repo or want a custom path

The workflow auto-detects your repo name and uses it as the `basePath`. If you want to deploy under a different path, edit `.github/workflows/deploy.yml`:

```yaml
env:
  NEXT_PUBLIC_BASE_PATH: /your-custom-path
```

### If your repo IS named `<username>.github.io`

That's a "user site" served from the root. Open the workflow and set:

```yaml
env:
  NEXT_PUBLIC_BASE_PATH: ""
```

### Preview the production build locally

```bash
NEXT_PUBLIC_BASE_PATH=/my-claude npm run build   # same as `npm run build:pages`
npm run preview                                  # serves the out/ folder
```

## Deploy to any other static host

The build outputs to `out/` — drop it into Cloudflare Pages, Vercel (with Static preset), Netlify, S3, Surge, anything. For sub-path deployments, set `NEXT_PUBLIC_BASE_PATH` at build time.

## How data flows

```
Browser (your visitor)
   ├─ Has API key in localStorage
   ├─ Has chat history in localStorage
   └─ Calls Anthropic API directly using @anthropic-ai/sdk
        (dangerouslyAllowBrowser: true)
                              ↓
                    https://api.anthropic.com
```

There is no backend server. The site is pure HTML/JS/CSS served from GitHub Pages.

**Security note:** Each visitor's key lives only in their own browser's localStorage. Anyone with access to that device can read it from DevTools. The Settings menu lets you remove the key at any time.

## File layout

- `app/page.tsx` — chat shell, state, streaming dispatch, key-gating
- `lib/anthropic-client.ts` — browser-side Anthropic SDK wrapper (verify, stream, title)
- `lib/storage.ts` — `localStorage` helpers for chats, prefs, and API key
- `lib/models.ts` — model catalog (edit to add/remove)
- `components/ApiKeySetup.tsx` — first-visit screen
- `components/SettingsMenu.tsx` — manage key, dark mode, clear/sign-out
- `components/Sidebar.tsx` — chat list, search, rename, delete
- `components/Composer.tsx` — input box + attachments + model picker
- `components/Message.tsx` — message bubbles, copy, regenerate
- `components/Markdown.tsx` — markdown + code highlighting + copy buttons
- `.github/workflows/deploy.yml` — auto-deploy on push to main
