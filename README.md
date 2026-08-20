# VGM Trivia Card Maker

A print-and-play card generator for your video-game-music guessing board game:

- **Front of card:** a QR code linking to the song (Spotify *or* YouTube — mix and match per card).
- **Back of card:** game title, release year, and studio, so players can check their guess.
- **▶ Play Mode:** play solo (or as a group around one screen) right in the browser — no printing needed. It plays each song in an embedded, auto-playing player and lets you reveal/hide the answer on demand.
- **🙈 Blind Mode:** blurs Game/Year/Studio/Notes everywhere on screen (the data table *and* the Backs print preview) so you can import/manage a big deck without spoiling it for yourself. Printed/PDF output is never blurred.

It's a single static web app — no install, no account, no server required.

## Quick start

1. Open [`index.html`](index.html) by double-clicking it (or right-click → Open with → your browser).
   - If your browser blocks local scripts from loading (rare, mostly older Safari), instead run a tiny local server from this folder and open `http://localhost:8000`:
     ```bash
     python -m http.server 8000
     ```
2. Click **Load Sample Deck** to see 8 example cards, or **+ Add Card** to start your own.
3. Fill in **Game**, **Year**, **Studio**, and a **Music URL** (a Spotify track/album link, or a YouTube link) for each card. Notes/composer is optional and only shows on the back if you enable it.
4. Adjust the settings bar: page size (A4/Letter), card size (poker/bridge/tarot/custom mm), duplex alignment, cut guides.
5. Click **🖨️ Print / Save PDF**. Choose "Save as PDF" in the print dialog, or print directly to cardstock.
6. **Export CSV** regularly to back up your deck (it also auto-saves to the browser's local storage, but a CSV is portable and safe).

Your data never leaves your machine — everything runs client-side in the browser, and the QR library ([`vendor/qrcode.js`](vendor/qrcode.js), MIT-licensed, by Kazuhiko Arase) is bundled locally so the app works fully offline.

## Playing solo (no printing required)

Click **▶ Play Mode** any time you have cards in your deck. It:

- Shuffles the deck and shows one card at a time (`3 / 8` counter).
- Embeds a real, auto-playing Spotify or YouTube player for that card's song — as long as the Music URL is a **direct track/video link** (see below), not a search link.
- **No spoilers before you guess:** the real player (cover art, song title, artist) stays completely hidden until you reveal the answer. While hidden you only get a plain "mystery" player — a play/pause button and a scrubber — with no identifying info at all. Click **Reveal Answer** (or press <kbd>Space</kbd>) and the real widget appears alongside the game/year/studio.
- **Next ▶** / **◀ Prev** (or arrow keys) move through the deck, auto-hiding the answer again for the next card (toggle this off with "Auto-hide answer on next card" if you'd rather leave answers visible).
- **🔀 Shuffle deck** re-randomizes at any point. <kbd>Esc</kbd> or the ✕ closes and stops playback.

This is the fastest way to actually play the game yourself while you're still building out the deck — no cutting, no printer needed.

**Note on Spotify previews:** the mystery player uses Spotify's embeddable widget, which (unless you're logged into Spotify in that browser) only plays a short preview clip of each track, sometimes just 15–30 seconds — usually plenty to guess from, but if a preview is unavailable for a track Spotify will show its own "Listen on Spotify" prompt instead. YouTube links don't have this limitation and play the full video.

## Playing blind (importing a deck without spoiling it for yourself)

If someone else (or a helper AI) built your deck for you, turn on **🙈 Blind Mode** in the toolbar *before* you import the CSV. With it on:

- The Game/Year/Studio/Notes columns in the data table are blurred — you can still see the Music URL, source badge, and row count, so you can confirm the import worked, just not what any card actually is.
- Clicking into a field to fix a typo sharpens just that field while it's focused, and blurs again once you click away.
- The **Backs** print preview is blurred too — the **Fronts** (QR-only) preview never needed it.
- Printed/exported PDF output is **never** blurred — the blur is purely an on-screen precaution so a physical card back is always readable once cut out.

Combined with **▶ Play Mode** (which never shows cover art/title until you hit Reveal regardless of this setting), you can build, print, and play an entire deck without ever having seen the answers yourself.

## Printing tips (physical cards)

- **Card stock:** 250–300gsm cardstock works well and feels like a real card once cut.
- **Duplex (front+back automatically aligned):** most home printers default to "flip on long edge." Use that duplex setting in the app, print a test sheet first, hold it up to the light to confirm front/back line up, then print the full deck. If your printer flips the other way, switch the app's setting to "short edge."
- **Glue method (most reliable, no alignment guesswork):** set the app's duplex option to *"Print separately & glue back-to-back."* Print the **Fronts** sheets, then the **Backs** sheets, cut both out, and glue each front to its matching back (spray adhesive or a glue stick works best to avoid warping). This is what most print-and-play hobbyists use for prototypes.
- **Sleeves:** if you don't want to glue, you can also print single-sided fronts and backs on separate cards and hold them together in an opaque card sleeve.
- Turn on **Cut guides** for a dashed cutting line around every card.

## Use direct track/video links, not search links

The QR code (and Play Mode's embedded player) encode exactly whatever you put in **Music URL** — nothing is validated against a real Spotify/YouTube API, and there's an important difference between link types:

- ✅ **Direct track link** — e.g. `https://open.spotify.com/track/2s4Xe6dJyrJ0ofV1xastvb` or `https://youtu.be/dQw4w9WgXcQ`. Scanning it (or playing it in Play Mode) jumps straight to that song and can auto-play.
- ❌ **Search link** — e.g. `https://open.spotify.com/search/...` or `youtube.com/results?search_query=...`. This only opens a results *list* — nothing plays automatically, and the player has to pick the right result themselves. Play Mode can't embed these at all (it shows an "Open link" button instead).

**How to get a real direct link:**
- *Spotify:* find the song in the Spotify app or web player → **⋯ (More) → Share → Copy Song Link**. You'll get something like `https://open.spotify.com/track/<22-character-id>?si=...` — that whole thing works fine.
- *YouTube:* open the actual video → **Share → Copy link**, or just copy the URL from the address bar once you're on the video's own page (`youtube.com/watch?v=...` or `youtu.be/...`).

The sample deck in this app now uses real, verified direct links for all 8 songs (mostly official soundtrack releases, plus one cover and one YouTube link for the two Nintendo tracks — see below) so you can see exactly what a working card looks like. Always test a card (scan it, or check it in Play Mode) before printing the full deck.

## Spotify vs. YouTube coverage for video game music

You asked me to check whether Spotify has enough video game music, so here's what I found:

**Spotify has decent coverage, but it's inconsistent:**
- Big/prominent franchises are generally there: Final Fantasy soundtracks are fully on Spotify, and Capcom has a lot up (Mega Man, Street Fighter, plus indie titles like Celeste, Fez, VA-11 HALL-A). Spotify has also been actively promoting gaming tie-ins (EA FC 26, Tony Hawk's Pro Skater 3+4, Battlefield, and Game Awards artist collaborations in Dec 2025).
- **Nintendo is the big gap** — Zelda soundtracks are notably absent from Spotify, and Nintendo music in general has very limited official presence.
- Once you move past blockbuster titles, availability drops off fast. Since ~2018, plenty of soundtracks (Borderlands, Dead Island, Dawn of War, Resident Evil 7, etc.) have been pulled or never added, largely due to licensing complexity between publishers and composers.
- Older/retro and Japanese-developed games are especially hard to find on Western Spotify.
- Indie games are the exception — since the developer usually owns the music outright, indie soundtracks tend to be easy to find.

**Practical takeaway for your board game:** don't rely on Spotify alone if your card list spans generations/publishers (especially anything Nintendo). YouTube has by far the deepest catalog of video game music — official channel uploads, full OST playlists, and comprehensive fan uploads for almost anything, including music that labels never bothered to put on streaming. That's why this app treats **Spotify and YouTube as equally first-class** per card: the "Music URL" column accepts either, and the front of the card auto-labels which service it is (small "Spotify"/"YouTube" tag under the QR code) so players know what to expect when they scan it.

**Suggested workflow per card:** search the game name + "soundtrack" or the specific track name on Spotify first; if nothing official (or no good cover) turns up, fall back to a direct YouTube video link (official channel > verified compilation > well-established fan upload). The sample deck demonstrates the full spectrum I actually found while curating it:

| Game | Link | What it actually is |
|---|---|---|
| Half-Life 2, Portal, Minecraft, Undertale, Celeste | Spotify | Official soundtrack releases (Valve, C418, Toby Fox, and Lena Raine all self-publish/license directly) |
| Final Fantasy VII | Spotify | "One-Winged Angel," officially licensed orchestral release (Square Enix's *Distant Worlds* series) |
| Super Mario Bros. | Spotify | A cover/arrangement — Nintendo's own OST isn't on Spotify, but a listenable cover is |
| Zelda: Ocarina of Time | YouTube | "Gerudo Valley" — Nintendo's OST isn't on Spotify at all, so this is a direct YouTube video link instead |

That mix is representative of what you'll run into for a real deck: indie/self-published composers (Toby Fox, C418, Lena Raine, Jonathan Coulton) are almost always cleanly available on Spotify; large publishers are hit-or-miss; Nintendo specifically you should plan on using YouTube for.

Sources: [ResetEra — video game soundtracks on Spotify](https://www.resetera.com/threads/video-games-soundtracks-on-spotify.137333/), [ResetEra — why so few game OSTs are on Spotify](https://www.resetera.com/threads/why-so-few-game-ost-are-available-on-spotify.87134/), [VGC — composers on game music licensing](https://www.videogameschronicle.com/features/composers-tell-us-why-developers-still-dont-take-game-music-seriously/), [Billboard — VGM licensing](https://www.billboard.com/pro/video-games-music-song-licensing-system-out-synch/).

## CSV format

Columns: `game,year,studio,url,notes`. Import via **Import CSV** (appends to your current deck) or grab **Download Template** for a starter file you can edit in Excel/Sheets and re-import.

## File structure

```
index.html      – app shell / layout
style.css       – styling + print stylesheet + Play Mode overlay
app.js          – all app logic (data, QR generation, layout, print, Play Mode)
vendor/qrcode.js – vendored MIT-licensed QR code generator (offline, no CDN)
```

*If you edit `app.js`/`style.css` yourself and your browser doesn't seem to pick up the change, do a hard refresh (Ctrl+Shift+R) — browsers can aggressively cache local files.*
