# OPEN — project home

Free film breakdown for every player and parent. This folder is the single home
for everything OPEN — the website, the brand, the tools, and the guides. Keep
working from here so nothing gets lost or out of sync, and so Claude Code can see
the whole project at once when it wires things together.

**Brand at a glance**
- Name: **OPEN** — free alternative to costly film platforms (Hudl, Veo).
- Logo: the **Spotlight O** — concentric rings closing on a solid core.
- Colors: **orange #F7802E → purple #8B4CF0** (gradient).
- Fonts: Barlow Condensed (display/wordmark), Inter (body).

---

## What's in here

### /site — the actual website
- **index.html** — the OPEN landing/product page (hero, features, mission).
- **registration.html** — the parent + admin account and player-registration
  site. Roles: owner (you), admin, parent. Currently saves in the browser as a
  demo; the Supabase step makes it real.

### /brand — logo and identity assets
- **open-logo.svg** — the wordmark (Spotlight O + "OPEN").
- **open-app-icon.svg** — 512×512 app icon on the plum square.
- **logo-explorations.html** — the five logo directions, for reference.

### /tools — the film tools
- **film-room.jsx** — the React film-breakdown tool (clips, spotlighting,
  tagging, AI-assisted reels).
- **player-tracker.zip** — the computer-vision starter (detect + track players,
  cut clips). This is the "AI watches the film" path; runs on a computer, grown
  with Claude Code.

### /guides — everything explained in plain English
- **OPEN_Foundations_Guide.docx** — domain, legal pages, and the up-to-date
  Supabase setup. **Start here.**
- **cloudflare-domain-steps.md** — buying your domain, step by step.
- **supabase-setup-original.md** — the earlier Supabase walkthrough (the docx
  version supersedes it; kept for reference).
- **Film_Room_App_Guide.docx** — the paths from prototype to an app store.

---

## Roadmap — the order to do things

1. **Buy the domain** → guides/cloudflare-domain-steps.md
2. **Generate Privacy + Terms pages** → Foundations guide, Part 2
3. **Set up Supabase** (accounts + database) → Foundations guide, Part 3
4. **Wire the site to Supabase** → hand /site to Claude Code (see below)
5. **Publish on Netlify** and connect the domain → Foundations guide, Part 3
6. **Later:** grow the film tools (player-tracker, coaching cues)

## For Claude Code — how to work with this project

- The site files have `>>> BACKEND HANDOFF` comments marking every spot where the
  browser-only demo logic should become real Supabase calls.
- Keep the OPEN design and the Spotlight-O logo exactly as-is when wiring.
- Roles matter: owner can grant/revoke admins; admins see the full roster;
  parents see only their own players. The Supabase row-level security rules in
  the Foundations guide enforce this — don't weaken them.
- This holds children's data. Preserve the parent-consent field and don't add
  data fields that aren't already collected.

## A note to future-you

Everything here is real and clickable except the live database, which comes
together at step 3–4. You don't need to be technical — the guides are written
for a non-developer, and the one coding step (wiring Supabase) is Claude Code's
job. Work top-to-bottom through the roadmap and OPEN comes together.
