/* VGM Trivia Card Maker
 * Fully client-side. No build step, no network calls except the ones you
 * choose to put in the "Music URL" column (Spotify or YouTube links).
 */

'use strict';

/* ---------------------------------------------------------------------- */
/* Constants                                                              */
/* ---------------------------------------------------------------------- */

const PAGE_SIZES_MM = {
  A4:     { w: 210,   h: 297   },
  Letter: { w: 215.9, h: 279.4 },
};

const CARD_SIZES_MM = {
  poker:  { w: 63.5, h: 88.9 },
  bridge: { w: 57.2, h: 88.9 },
  tarot:  { w: 70,   h: 120  },
};

const MARGIN_MM = 10;
const GAP_MM = 4;

const STORAGE_KEY = 'vgmCardMaker.v1';

const SAMPLE_CARDS = [
  { game: 'Super Mario Bros.', year: '1985', studio: 'Nintendo R&D4', url: 'https://open.spotify.com/track/03fijJ2GEzZ92Zl5fuTxI7', notes: 'Koji Kondo — cover recording (official Nintendo OST is not on Spotify)' },
  { game: 'The Legend of Zelda: Ocarina of Time', year: '1998', studio: 'Nintendo EAD', url: 'https://www.youtube.com/watch?v=0hEYvdMoF2g', notes: 'Koji Kondo — "Gerudo Valley" (Nintendo OST absent from Spotify, linked via YouTube)' },
  { game: 'Half-Life 2', year: '2004', studio: 'Valve', url: 'https://open.spotify.com/track/3EAX272za8qK7lZziGwDDy', notes: 'Kelly Bailey — "Triage at Dawn" (official Valve OST)' },
  { game: 'Final Fantasy VII', year: '1997', studio: 'Square', url: 'https://open.spotify.com/track/2N2XmjVEzutc5U1LIRIdaP', notes: 'Nobuo Uematsu — "One-Winged Angel" (official licensed release)' },
  { game: 'Portal', year: '2007', studio: 'Valve', url: 'https://open.spotify.com/track/76jLguvP9uwjwYpApKUNvW', notes: 'Jonathan Coulton & GLaDOS — "Still Alive" (official Orange Box OST)' },
  { game: 'Minecraft', year: '2011', studio: 'Mojang Studios', url: 'https://open.spotify.com/track/4NsPgRYUdHu2Q5JRNgXYU5', notes: 'C418 — "Sweden" (official Minecraft – Volume Alpha)' },
  { game: 'Undertale', year: '2015', studio: 'tobyfox', url: 'https://open.spotify.com/track/2pSmmjPNHG3FIVh6dgy24e', notes: 'Toby Fox — "Megalovania" (official OST)' },
  { game: 'Celeste', year: '2018', studio: 'Maddy Makes Games', url: 'https://open.spotify.com/track/03EyMyy76ZYLUh3lvGrNgE', notes: 'Lena Raine — "First Steps" (official OST)' },
];

/* ---------------------------------------------------------------------- */
/* State                                                                  */
/* ---------------------------------------------------------------------- */

let state = {
  cards: [],
  settings: {
    pageSize: 'A4',
    cardSize: 'poker',
    customW: 63.5,
    customH: 88.9,
    duplex: 'long',
    cutGuides: true,
    showNotes: true,
    zoom: 0.55,
    blindMode: false,
  },
};

let nextId = 1;

/* ---------------------------------------------------------------------- */
/* Persistence                                                            */
/* ---------------------------------------------------------------------- */

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* localStorage may be unavailable (e.g. some file:// contexts) - ignore */
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.cards)) {
      state = Object.assign(state, parsed);
      return state.cards.length > 0;
    }
  } catch (e) { /* ignore corrupt storage */ }
  return false;
}

/* ---------------------------------------------------------------------- */
/* Helpers                                                                */
/* ---------------------------------------------------------------------- */

function uid() { return 'c' + (nextId++) + '_' + Math.random().toString(36).slice(2, 7); }

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function detectSource(url) {
  if (!url || !url.trim()) return 'missing';
  const u = url.toLowerCase();
  if (u.includes('spotify.com') || u.startsWith('spotify:')) return 'spotify';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return 'other';
}

function sourceLabel(src) {
  return { spotify: 'Spotify', youtube: 'YouTube', other: 'Link', missing: 'No link' }[src];
}

// Extracts a directly-embeddable Spotify track ID or YouTube video ID from a URL,
// so Play Mode can embed a real player instead of just linking out. Search-result
// URLs (which can't autoplay a specific song) fall through with embed:null.
function parseEmbedInfo(url) {
  const src = detectSource(url);
  if (src === 'spotify') {
    const m = url.match(/track[/:]([a-zA-Z0-9]{10,})/);
    if (m) {
      return { type: 'spotify', embed: `https://open.spotify.com/embed/track/${m[1]}?utm_source=generator&theme=0` };
    }
  }
  if (src === 'youtube') {
    let id = null;
    let m = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    if (m) id = m[1];
    if (!id) { m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/); if (m) id = m[1]; }
    if (!id) { m = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/); if (m) id = m[1]; }
    if (id) {
      return { type: 'youtube', embed: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` };
    }
  }
  return { type: src, embed: null };
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function getCardSizeMm(settings) {
  if (settings.cardSize === 'custom') {
    return { w: Number(settings.customW) || 63.5, h: Number(settings.customH) || 88.9 };
  }
  return CARD_SIZES_MM[settings.cardSize] || CARD_SIZES_MM.poker;
}

/* ---------------------------------------------------------------------- */
/* CSV import / export                                                    */
/* ---------------------------------------------------------------------- */

const CSV_HEADER = ['game', 'year', 'studio', 'url', 'notes'];

function csvEscapeField(v) {
  const s = String(v == null ? '' : v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function cardsToCsv(cards) {
  const lines = [CSV_HEADER.join(',')];
  for (const c of cards) {
    lines.push(CSV_HEADER.map(k => csvEscapeField(c[k])).join(','));
  }
  return lines.join('\r\n');
}

function parseCsv(text) {
  // Small state-machine CSV parser: handles quoted fields, commas, and embedded newlines.
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\r') { /* skip */ }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else { field += ch; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(f => f.trim() !== ''));
}

function csvToCards(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  let start = 0;
  const header = rows[0].map(h => h.trim().toLowerCase());
  const looksLikeHeader = CSV_HEADER.every(k => header.includes(k));
  let colIndex = { game: 0, year: 1, studio: 2, url: 3, notes: 4 };
  if (looksLikeHeader) {
    start = 1;
    colIndex = {};
    header.forEach((h, idx) => { colIndex[h] = idx; });
  }
  const out = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    out.push({
      id: uid(),
      game: (r[colIndex.game] || '').trim(),
      year: (r[colIndex.year] || '').trim(),
      studio: (r[colIndex.studio] || '').trim(),
      url: (r[colIndex.url] || '').trim(),
      notes: (r[colIndex.notes] || '').trim(),
    });
  }
  return out;
}

function downloadTextFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------------------------------------------------------------------- */
/* Data table rendering                                                   */
/* ---------------------------------------------------------------------- */

const els = {};

function cacheEls() {
  [
    'btnAddCard', 'btnLoadSample', 'btnClearAll', 'csvFileInput', 'btnExportCsv',
    'btnDownloadTemplate', 'btnPrint', 'setPageSize', 'setCardSize', 'customSizeWrap',
    'setCustomW', 'setCustomH', 'setDuplex', 'setCutGuides', 'setShowNotes', 'setZoom',
    'setBlindMode',
    'cardTableBody', 'cardCount', 'frontSheets', 'backSheets',
    'btnPlayMode', 'playOverlay', 'playClose', 'playProgress', 'playEmbed',
    'playPrev', 'playReveal', 'playNext', 'playAnswer', 'playGame', 'playYear',
    'playStudio', 'playNotes', 'playShuffle', 'playAutoHide',
    'playMystery', 'playMysteryIcon', 'playMysteryToggle', 'playProgressBar',
    'playTimeLabel', 'playWidgetHost', 'playNolink', 'playOpenLinkWrap',
  ].forEach(id => { els[id] = document.getElementById(id); });
}

function renderTable() {
  const tbody = els.cardTableBody;
  tbody.innerHTML = '';
  els.cardCount.textContent = state.cards.length;

  if (!state.cards.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="text-align:center;color:#9aa0ab;padding:18px;">
      No cards yet. Click <strong>+ Add Card</strong> or <strong>Load Sample Deck</strong> to get started.
    </td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const card of state.cards) {
    const tr = document.createElement('tr');
    const invalid = !card.game.trim() || !/^\d{4}$/.test(card.year.trim()) || !card.url.trim();
    if (invalid) tr.classList.add('row-invalid');
    const src = detectSource(card.url);

    tr.innerHTML = `
      <td><input type="text" data-field="game" placeholder="e.g. Chrono Trigger" value="${escapeHtml(card.game)}"></td>
      <td><input type="text" data-field="year" placeholder="1995" value="${escapeHtml(card.year)}" maxlength="4"></td>
      <td><input type="text" data-field="studio" placeholder="Square" value="${escapeHtml(card.studio)}"></td>
      <td>
        <input type="text" data-field="url" placeholder="https://open.spotify.com/track/... or https://youtu.be/..." value="${escapeHtml(card.url)}">
        <span class="url-badge ${src}">${sourceLabel(src)}</span>
      </td>
      <td><input type="text" data-field="notes" placeholder="Composer / track name" value="${escapeHtml(card.notes)}"></td>
      <td><button class="row-del" title="Delete card">✕</button></td>
    `;

    tr.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        card[input.dataset.field] = input.value;
        saveState();
        scheduleRenderPreview();
        // live-update just this row's badge / invalid state without a full table rebuild
        if (input.dataset.field === 'url') {
          const badge = tr.querySelector('.url-badge');
          const s = detectSource(card.url);
          badge.className = 'url-badge ' + s;
          badge.textContent = sourceLabel(s);
        }
        const stillInvalid = !card.game.trim() || !/^\d{4}$/.test(card.year.trim()) || !card.url.trim();
        tr.classList.toggle('row-invalid', stillInvalid);
      });
    });

    tr.querySelector('.row-del').addEventListener('click', () => {
      state.cards = state.cards.filter(c => c.id !== card.id);
      saveState();
      renderTable();
      renderPreview();
    });

    tbody.appendChild(tr);
  }
}

/* ---------------------------------------------------------------------- */
/* Layout engine                                                          */
/* ---------------------------------------------------------------------- */

function computeLayout(settings) {
  const page = PAGE_SIZES_MM[settings.pageSize];
  const card = getCardSizeMm(settings);

  const cols = Math.max(1, Math.floor((page.w - 2 * MARGIN_MM + GAP_MM) / (card.w + GAP_MM)));
  const rows = Math.max(1, Math.floor((page.h - 2 * MARGIN_MM + GAP_MM) / (card.h + GAP_MM)));

  const contentW = cols * card.w + (cols - 1) * GAP_MM;
  const contentH = rows * card.h + (rows - 1) * GAP_MM;
  const offsetX = (page.w - contentW) / 2;
  const offsetY = (page.h - contentH) / 2;

  const positions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push({
        x: offsetX + c * (card.w + GAP_MM),
        y: offsetY + r * (card.h + GAP_MM),
        r, c,
      });
    }
  }

  return { page, card, cols, rows, perPage: cols * rows, positions };
}

function backSlotOrder(layout, mode) {
  const { cols, rows } = layout;
  // returns an array mapping "slot index in printing order" -> "front slot index"
  const order = new Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const destSlot = r * cols + c;
      let srcR = r, srcC = c;
      if (mode === 'long') srcC = cols - 1 - c;        // mirror left-right
      else if (mode === 'short') srcR = rows - 1 - r;  // mirror top-bottom
      order[destSlot] = srcR * cols + srcC;
    }
  }
  return order;
}

/* ---------------------------------------------------------------------- */
/* QR + card rendering                                                    */
/* ---------------------------------------------------------------------- */

function makeQrSvg(text) {
  try {
    const qr = qrcode(0, 'M'); // typeNumber 0 = auto-detect smallest version
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  } catch (e) {
    return '<div style="font-size:0.6em;color:#c00;">QR error</div>';
  }
}

function cardFrontHtml(card) {
  const src = detectSource(card.url);
  if (src === 'missing') {
    return `<div class="card-front">
      <div class="scan-hint" style="color:#c00;">No music URL set</div>
    </div>`;
  }
  return `<div class="card-front">
    <div class="qr-wrap">${makeQrSvg(card.url)}</div>
    <div class="scan-hint">${sourceLabel(src)} · Scan to play</div>
  </div>`;
}

function cardBackHtml(card, showNotes) {
  return `<div class="card-back">
    <div class="cb-game">${escapeHtml(card.game || '(untitled)')}</div>
    <div class="cb-year">${escapeHtml(card.year || '?')}</div>
    <div class="cb-studio">${escapeHtml(card.studio || '')}</div>
    ${showNotes && card.notes ? `<div class="cb-notes">${escapeHtml(card.notes)}</div>` : ''}
  </div>`;
}

function makeSheetEl(page, cutGuides) {
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.style.width = page.w + 'mm';
  sheet.style.height = page.h + 'mm';
  return sheet;
}

function placeCard(sheet, layout, slotIndex, innerHtml, cutGuides) {
  const pos = layout.positions[slotIndex];
  const div = document.createElement('div');
  div.className = 'card' + (cutGuides ? ' cut-guides' : '');
  div.style.left = pos.x + 'mm';
  div.style.top = pos.y + 'mm';
  div.style.width = layout.card.w + 'mm';
  div.style.height = layout.card.h + 'mm';
  div.innerHTML = innerHtml;
  sheet.appendChild(div);
}

function renderPreview() {
  const s = state.settings;
  const layout = computeLayout(s);

  els.frontSheets.innerHTML = '';
  els.backSheets.innerHTML = '';
  els.frontSheets.style.transform = `scale(${s.zoom})`;
  els.backSheets.style.transform = `scale(${s.zoom})`;

  if (!state.cards.length) {
    els.frontSheets.innerHTML = '<div class="empty-hint">Add cards to see the printable sheet preview.</div>';
    return;
  }

  const perPage = layout.perPage;
  const pages = Math.ceil(state.cards.length / perPage);
  const backOrder = backSlotOrder(layout, s.duplex);

  for (let p = 0; p < pages; p++) {
    const pageCards = state.cards.slice(p * perPage, p * perPage + perPage);

    const frontSheet = makeSheetEl(layout.page);
    const backSheet = makeSheetEl(layout.page);

    for (let slot = 0; slot < perPage; slot++) {
      const frontCard = pageCards[slot];
      if (frontCard) placeCard(frontSheet, layout, slot, cardFrontHtml(frontCard), s.cutGuides);

      const backCard = pageCards[backOrder[slot]];
      if (backCard) placeCard(backSheet, layout, slot, cardBackHtml(backCard, s.showNotes), s.cutGuides);
    }

    els.frontSheets.appendChild(frontSheet);
    els.backSheets.appendChild(backSheet);
  }
}

const scheduleRenderPreview = debounce(renderPreview, 200);

/* ---------------------------------------------------------------------- */
/* Play mode (solo digital play: listen, guess, reveal)                   */
/* ---------------------------------------------------------------------- */

let playDeck = [];
let playIndex = 0;
let playRevealed = false;

// The currently-live player: either a Spotify iFrame API controller or a
// YouTube IFrame Player. Both expose enough of a common shape (play/pause,
// current position) that we drive them through the same custom "mystery"
// transport controls instead of ever showing their built-in UI (which would
// leak the track title / cover art / video thumbnail before the reveal).
let currentController = null;
let currentControllerType = null; // 'spotify' | 'youtube'
let progressPollTimer = null;
let userIsSeeking = false;
let embedRequestId = 0; // guards against a stale async load finishing after Next/Prev

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---- Lazily-loaded, cached iFrame APIs ---- */

let spotifyApiPromise = null;
function loadSpotifyIframeApi() {
  if (!spotifyApiPromise) {
    spotifyApiPromise = new Promise((resolve) => {
      if (window.__SpotifyIframeApi) { resolve(window.__SpotifyIframeApi); return; }
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        window.__SpotifyIframeApi = IFrameAPI;
        resolve(IFrameAPI);
      };
      const script = document.createElement('script');
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.async = true;
      document.head.appendChild(script);
    });
  }
  return spotifyApiPromise;
}

let youtubeApiPromise = null;
function loadYoutubeIframeApi() {
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) { resolve(window.YT); return; }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    });
  }
  return youtubeApiPromise;
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function setMysteryPlaying(playing) {
  els.playMysteryIcon.classList.toggle('spinning', playing);
  els.playMysteryToggle.textContent = playing ? '⏸ Pause' : '▶ Play';
}

function updateProgressUi(positionSec, durationSec) {
  if (!userIsSeeking) {
    els.playProgressBar.max = durationSec || 0;
    els.playProgressBar.value = positionSec || 0;
  }
  els.playTimeLabel.textContent = `${formatTime(positionSec)} / ${formatTime(durationSec)}`;
}

function teardownPlayer() {
  if (progressPollTimer) { clearInterval(progressPollTimer); progressPollTimer = null; }
  if (currentController && currentControllerType === 'youtube') {
    try { currentController.destroy(); } catch (e) { /* already gone */ }
  }
  // Spotify controllers are torn down simply by clearing their mount's
  // innerHTML below, which removes the underlying iframe.
  currentController = null;
  currentControllerType = null;
  els.playProgressBar.value = 0;
  els.playProgressBar.max = 0;
  els.playTimeLabel.textContent = '0:00 / 0:00';
  setMysteryPlaying(false);
}

function openPlayMode() {
  if (!state.cards.length) { alert('Add some cards first!'); return; }
  playDeck = shuffleArray(state.cards);
  playIndex = 0;
  playRevealed = false;
  els.playOverlay.classList.remove('hidden');
  document.addEventListener('keydown', onPlayKeydown);
  showPlayCard();
}

function closePlayMode() {
  teardownPlayer();
  embedRequestId++; // invalidate any in-flight async load
  els.playWidgetHost.innerHTML = '';
  els.playOverlay.classList.add('hidden');
  document.removeEventListener('keydown', onPlayKeydown);
}

function onPlayKeydown(e) {
  if (e.key === 'Escape') closePlayMode();
  else if (e.key === 'ArrowRight') goPlayNext();
  else if (e.key === 'ArrowLeft') goPlayPrev();
  else if (e.key === ' ') { e.preventDefault(); setAnswerVisible(!playRevealed); }
}

async function renderPlayEmbed(card) {
  teardownPlayer();
  const myRequest = ++embedRequestId;

  const info = parseEmbedInfo(card.url);
  els.playWidgetHost.innerHTML = '';
  els.playOpenLinkWrap.innerHTML = '';
  els.playMystery.classList.add('hidden');
  els.playNolink.classList.add('hidden');

  if (info.type === 'spotify' && info.embed) {
    els.playMystery.classList.remove('hidden');
    els.playOpenLinkWrap.innerHTML = `<a class="play-openlink" href="${escapeHtml(card.url)}" target="_blank" rel="noopener">Open in Spotify ↗</a>`;
    const trackId = (card.url.match(/track[/:]([a-zA-Z0-9]{10,})/) || [])[1];
    if (!trackId) return;

    const IFrameAPI = await loadSpotifyIframeApi();
    if (myRequest !== embedRequestId) return; // a newer card was requested meanwhile

    const mount = document.createElement('div');
    els.playWidgetHost.appendChild(mount);
    IFrameAPI.createController(mount, { uri: `spotify:track:${trackId}`, width: '100%', height: '152' }, (controller) => {
      if (myRequest !== embedRequestId) { try { controller.pause(); } catch (e) {} return; }
      currentController = controller;
      currentControllerType = 'spotify';
      controller.addListener('ready', () => { try { controller.play(); } catch (e) {} });
      controller.addListener('playback_update', (e) => {
        const { position, duration, isPaused } = e.data;
        setMysteryPlaying(!isPaused);
        updateProgressUi((position || 0) / 1000, (duration || 0) / 1000);
      });
    });
  } else if (info.type === 'youtube' && info.embed) {
    els.playMystery.classList.remove('hidden');
    els.playOpenLinkWrap.innerHTML = `<a class="play-openlink" href="${escapeHtml(card.url)}" target="_blank" rel="noopener">Open in YouTube ↗</a>`;
    const videoId = (info.embed.match(/embed\/([a-zA-Z0-9_-]+)/) || [])[1];
    if (!videoId) return;

    const YT = await loadYoutubeIframeApi();
    if (myRequest !== embedRequestId) return;

    const mount = document.createElement('div');
    els.playWidgetHost.appendChild(mount);
    currentControllerType = 'youtube';
    currentController = new YT.Player(mount, {
      videoId,
      width: '100%',
      height: '220',
      playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0 },
      events: {
        onReady: (e) => {
          if (myRequest !== embedRequestId) { try { e.target.destroy(); } catch (er) {} return; }
          try { e.target.playVideo(); } catch (er) {}
          progressPollTimer = setInterval(() => {
            if (myRequest !== embedRequestId || !currentController) return;
            try { updateProgressUi(currentController.getCurrentTime(), currentController.getDuration()); } catch (er) {}
          }, 400);
        },
        onStateChange: (e) => {
          if (myRequest !== embedRequestId) return;
          setMysteryPlaying(e.data === YT.PlayerState.PLAYING);
        },
      },
    });
  } else if (card.url && card.url.trim()) {
    els.playNolink.classList.remove('hidden');
    els.playNolink.textContent = "This link isn't a direct track/video link, so it can't play here.";
    els.playOpenLinkWrap.innerHTML = `<a class="play-openlink" href="${escapeHtml(card.url)}" target="_blank" rel="noopener">Open link ↗</a>`;
  } else {
    els.playNolink.classList.remove('hidden');
    els.playNolink.textContent = 'No music URL set for this card.';
  }
}

function toggleMysteryPlayback() {
  if (!currentController) return;
  if (currentControllerType === 'spotify') {
    currentController.togglePlay();
  } else if (currentControllerType === 'youtube' && window.YT) {
    const state = currentController.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) currentController.pauseVideo();
    else currentController.playVideo();
  }
}

function seekTo(seconds) {
  if (!currentController) return;
  if (currentControllerType === 'spotify') currentController.seek(seconds);
  else if (currentControllerType === 'youtube') currentController.seekTo(seconds, true);
}

function setAnswerVisible(visible) {
  playRevealed = visible;
  els.playAnswer.classList.toggle('hidden', !visible);
  els.playReveal.textContent = visible ? 'Hide Answer' : 'Reveal Answer';
  // The real widget (cover art, title, artist) only appears once it's safe to see it.
  els.playWidgetHost.classList.toggle('spoiler-hidden', !visible);
}

function showPlayCard() {
  const card = playDeck[playIndex];
  els.playProgress.textContent = `${playIndex + 1} / ${playDeck.length}`;
  renderPlayEmbed(card);
  els.playGame.textContent = card.game || '(untitled)';
  els.playYear.textContent = card.year || '?';
  els.playStudio.textContent = card.studio || '';
  els.playNotes.textContent = card.notes || '';
  els.playNotes.classList.toggle('hidden', !card.notes);
  setAnswerVisible(els.playAutoHide.checked ? false : playRevealed);
  els.playPrev.disabled = playIndex === 0;
  els.playNext.textContent = playIndex === playDeck.length - 1 ? 'Restart ⟲' : 'Next ▶';
}

function goPlayNext() {
  playIndex = playIndex < playDeck.length - 1 ? playIndex + 1 : 0;
  showPlayCard();
}
function goPlayPrev() {
  if (playIndex > 0) { playIndex--; showPlayCard(); }
}

function wirePlayMode() {
  els.btnPlayMode.addEventListener('click', openPlayMode);
  els.playClose.addEventListener('click', closePlayMode);
  els.playNext.addEventListener('click', goPlayNext);
  els.playPrev.addEventListener('click', goPlayPrev);
  els.playReveal.addEventListener('click', () => setAnswerVisible(!playRevealed));
  els.playMysteryToggle.addEventListener('click', toggleMysteryPlayback);
  els.playProgressBar.addEventListener('pointerdown', () => { userIsSeeking = true; });
  els.playProgressBar.addEventListener('change', () => {
    seekTo(Number(els.playProgressBar.value));
    userIsSeeking = false;
  });
  els.playShuffle.addEventListener('click', () => {
    playDeck = shuffleArray(playDeck);
    playIndex = 0;
    showPlayCard();
  });
  els.playOverlay.addEventListener('click', (e) => {
    if (e.target === els.playOverlay) closePlayMode(); // click on backdrop
  });
}

/* ---------------------------------------------------------------------- */
/* Print @page size                                                       */
/* ---------------------------------------------------------------------- */

function updatePageStyle() {
  let styleEl = document.getElementById('dynamicPageSize');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamicPageSize';
    document.head.appendChild(styleEl);
  }
  const page = PAGE_SIZES_MM[state.settings.pageSize];
  styleEl.textContent = `@page { size: ${page.w}mm ${page.h}mm; margin: 0; }`;
}

/* ---------------------------------------------------------------------- */
/* Settings <-> UI wiring                                                 */
/* ---------------------------------------------------------------------- */

function applySettingsToUi() {
  const s = state.settings;
  els.setPageSize.value = s.pageSize;
  els.setCardSize.value = s.cardSize;
  els.setCustomW.value = s.customW;
  els.setCustomH.value = s.customH;
  els.setDuplex.value = s.duplex;
  els.setCutGuides.checked = s.cutGuides;
  els.setShowNotes.checked = s.showNotes;
  els.setZoom.value = s.zoom;
  els.setBlindMode.checked = s.blindMode;
  els.customSizeWrap.classList.toggle('hidden', s.cardSize !== 'custom');
  applyBlindModeToUi();
}

function applyBlindModeToUi() {
  document.getElementById('app').classList.toggle('blind-mode', !!state.settings.blindMode);
}

function wireSettings() {
  els.setPageSize.addEventListener('change', () => {
    state.settings.pageSize = els.setPageSize.value;
    updatePageStyle(); saveState(); renderPreview();
  });
  els.setCardSize.addEventListener('change', () => {
    state.settings.cardSize = els.setCardSize.value;
    els.customSizeWrap.classList.toggle('hidden', state.settings.cardSize !== 'custom');
    saveState(); renderPreview();
  });
  els.setCustomW.addEventListener('input', () => {
    state.settings.customW = els.setCustomW.value; saveState(); scheduleRenderPreview();
  });
  els.setCustomH.addEventListener('input', () => {
    state.settings.customH = els.setCustomH.value; saveState(); scheduleRenderPreview();
  });
  els.setDuplex.addEventListener('change', () => {
    state.settings.duplex = els.setDuplex.value; saveState(); renderPreview();
  });
  els.setCutGuides.addEventListener('change', () => {
    state.settings.cutGuides = els.setCutGuides.checked; saveState(); renderPreview();
  });
  els.setShowNotes.addEventListener('change', () => {
    state.settings.showNotes = els.setShowNotes.checked; saveState(); renderPreview();
  });
  els.setZoom.addEventListener('input', () => {
    state.settings.zoom = Number(els.setZoom.value); saveState();
    els.frontSheets.style.transform = `scale(${state.settings.zoom})`;
    els.backSheets.style.transform = `scale(${state.settings.zoom})`;
  });
  els.setBlindMode.addEventListener('change', () => {
    state.settings.blindMode = els.setBlindMode.checked;
    saveState();
    applyBlindModeToUi();
  });
}

/* ---------------------------------------------------------------------- */
/* Toolbar wiring                                                         */
/* ---------------------------------------------------------------------- */

function addCard(partial) {
  state.cards.push(Object.assign({ id: uid(), game: '', year: '', studio: '', url: '', notes: '' }, partial || {}));
}

function wireToolbar() {
  els.btnAddCard.addEventListener('click', () => {
    addCard();
    saveState(); renderTable(); renderPreview();
  });

  els.btnLoadSample.addEventListener('click', () => {
    if (state.cards.length && !confirm('This will append the 8-card sample deck to your current cards. Continue?')) return;
    SAMPLE_CARDS.forEach(c => addCard(c));
    saveState(); renderTable(); renderPreview();
  });

  els.btnClearAll.addEventListener('click', () => {
    if (!state.cards.length) return;
    if (!confirm('Delete all cards? This cannot be undone.')) return;
    state.cards = [];
    saveState(); renderTable(); renderPreview();
  });

  els.csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = csvToCards(String(reader.result));
      if (!imported.length) { alert('No rows found in that CSV.'); return; }
      state.cards = state.cards.concat(imported);
      saveState(); renderTable(); renderPreview();
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  els.btnExportCsv.addEventListener('click', () => {
    downloadTextFile('vgm-cards.csv', cardsToCsv(state.cards), 'text/csv');
  });

  els.btnDownloadTemplate.addEventListener('click', () => {
    const template = [
      { game: 'Chrono Trigger', year: '1995', studio: 'Square', url: 'https://open.spotify.com/track/REPLACE_ME', notes: 'Yasunori Mitsuda' },
    ];
    downloadTextFile('vgm-cards-template.csv', cardsToCsv(template), 'text/csv');
  });

  els.btnPrint.addEventListener('click', () => window.print());
}

/* ---------------------------------------------------------------------- */
/* Init                                                                   */
/* ---------------------------------------------------------------------- */

let __initialized = false;

function init() {
  if (__initialized) return;
  __initialized = true;

  cacheEls();
  const hadSaved = loadState();
  applySettingsToUi();
  updatePageStyle();
  wireSettings();
  wireToolbar();
  wirePlayMode();
  renderTable();
  renderPreview();

  if (!hadSaved && !state.cards.length) {
    // First-ever run: seed with a couple of placeholder rows so the UI isn't empty.
    addCard();
    addCard();
    renderTable();
    renderPreview();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
