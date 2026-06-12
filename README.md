# SKYSHIELD — Counter-UAS Base Defense

A browser-based tower defense game about modern base defense against drones, swarms, loitering munitions, and cruise missiles. One file (`index.html`), no build step, no dependencies.

## Play locally

Just double-click `index.html` — it runs in any modern browser.

## Publish on GitHub Pages (free hosting)

1. Create a GitHub account at https://github.com if you don't have one.
2. Click **+** (top right) → **New repository**. Name it anything (e.g. `skyshield`). Set it to **Public**. Click **Create repository**.
3. On the new repo page, click **uploading an existing file**, drag in `index.html` (and this README if you like), then click **Commit changes**.
4. Go to **Settings → Pages** (left sidebar). Under "Branch", select **main**, folder **/ (root)**, click **Save**.
5. Wait ~1 minute. Your game is live at:
   `https://YOUR-USERNAME.github.io/skyshield/`

Share that link — anyone can play.

## Enable the global leaderboard (optional, ~5 minutes)

Out of the box, high scores are saved only in each player's browser. For a shared leaderboard everyone competes on, use a free Supabase database:

1. Go to https://supabase.com → **Start your project** → sign up (free tier is plenty).
2. Create a **New project** (any name, any region, set a database password — you won't need it again).
3. When the project finishes loading, open the **SQL Editor** (left sidebar), paste this, and click **Run**:

   ```sql
   create table scores (
     id bigint generated always as identity primary key,
     name text not null check (char_length(name) between 1 and 16),
     score integer not null check (score >= 0 and score <= 10000000),
     created_at timestamptz default now()
   );

   alter table scores enable row level security;

   create policy "anyone can read scores"
     on scores for select using (true);

   create policy "anyone can submit a score"
     on scores for insert with check (true);
   ```

4. Go to **Project Settings → API** (or the "Connect" button). Copy two values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public API key**
5. Open `index.html` in a text editor, find these lines near the top of the `<script>` section, and paste your values in:

   ```js
   const SUPABASE_URL = "";        // e.g. "https://abcdefgh.supabase.co"
   const SUPABASE_ANON_KEY = "";   // your anon/public key
   ```

6. Re-upload `index.html` to your GitHub repo (same drag-and-drop, it will replace the old one). Done — the main menu will show "GLOBAL LEADERBOARD: ONLINE".

Note: the anon key is designed to be public — it can only do what the policies above allow (read scores, insert scores). Since there are no accounts, a determined person could submit a fake score; that's the accepted trade-off for a friction-free leaderboard.

## Game overview

| System | Emplace | Per use | Strengths | Limits |
|---|---|---|---|---|
| SAM Battery | $400 | $75/interceptor | Kills anything in one hit, longest range | Expensive per shot |
| EW Jammer | $150 | Free | Jams every susceptible target in range at once | Only targets with known waveforms; useless vs autonomous/hardened |
| HEL Laser | $600 | ~Free | Works on any target type | One target at a time; needs dwell time to burn through |
| HPM Emitter | $550 | Free | Hits everything in range — the swarm killer | Short range; hardened targets resist most of each pulse |

Six levels form one persistent campaign: your emplacements and funds carry over from level to level, with a budget supplement at the start of each. The story arc teaches cost asymmetry — you start with traditional missiles against expensive threats, get swamped by cheap drone masses, then unlock directed energy (HEL, HPM) to flip the economics back. Levels escalate from quadcopters on known ingress corridors to 360° combined-arms raids with autonomous swarms, hardened loitering munitions, and cruise missiles. Score comes from kills, wave clears, and base integrity at level completion.

Other systems: each emplacement can be upgraded twice (more range, more damage/faster) or sold for a 60% refund — click it to open the panel. The SAM battery has a ROE (rules of engagement) panel to toggle which target types it engages, so you don't waste $75 interceptors on $6 swarm drones. EW-immune targets (autonomous, fiber-optic guided) are marked with an amber ◇ diamond.

Controls: keys 1–4 or click a card to select a system, click the map to emplace, right-click/ESC to cancel, click an emplaced system to upgrade or sell, Space or the button to launch the next wave, speed toggle up to 3×.
