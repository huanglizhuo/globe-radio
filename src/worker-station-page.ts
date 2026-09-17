/**
 * HTML generation for server-rendered station landing pages (`/station/:uuid`).
 *
 * This module is deliberately free of Workers runtime globals (no fetch /
 * caches / Request) so the templates can be unit-tested in plain Node: it only
 * builds strings from data. Routing, upstream fetching and edge caching live
 * in `worker.ts`.
 */

/** Canonical production origin used for absolute URLs (canonical/og/sitemap). */
export const SITE_ORIGIN = 'https://gradio.clothpath.com';

/** Minimal shape of a radio-browser.info station object that we consume. */
export interface UpstreamStation {
  stationuuid?: string;
  name?: string;
  url?: string;
  url_resolved?: string;
  homepage?: string;
  tags?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  language?: string;
  votes?: number;
  codec?: string;
  bitrate?: number;
  lastcheckok?: number;
}

/** Escape a dynamic value for safe interpolation into HTML text or attributes. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Turn an ISO 3166-1 alpha-2 code into its regional-indicator flag emoji. */
export function countryFlagEmoji(countrycode: unknown): string {
  const cc = String(countrycode ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🌐';
  return String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** First `max` non-empty tags from the upstream comma-separated tag string. */
function firstTags(tags: unknown, max: number): string[] {
  return String(tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, max);
}

/** Shared dark-walnut styles for the station page and the 404 page. */
const PAGE_CSS = `
  :root {
    color-scheme: dark;
    --bg: #1a120b;
    --panel: #241811;
    --panel-2: #2c1f14;
    --line: #3d2c1c;
    --text: #f4e8cf;
    --muted: #bfae8f;
    --accent: #e0503a;
    --lcd: #b8d99a;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background:
      radial-gradient(1100px 520px at 50% -180px, rgba(224, 80, 58, 0.16), transparent 70%),
      var(--bg);
    color: var(--text);
    font-family: 'Archivo', 'Segoe UI', system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .wrap { width: 100%; max-width: 760px; margin: 0 auto; padding: 0 20px; }
  .site-header {
    border-bottom: 1px solid var(--line);
    background: rgba(26, 18, 11, 0.88);
    position: sticky;
    top: 0;
    backdrop-filter: blur(6px);
  }
  .wordmark {
    display: inline-block;
    padding: 14px 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.38em;
    color: var(--lcd);
    text-decoration: none;
  }
  .wordmark:hover { color: var(--accent); }
  main { flex: 1; padding: 40px 0 24px; }
  .kicker {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0;
  }
  h1 {
    font-size: clamp(26px, 5vw, 40px);
    line-height: 1.15;
    font-weight: 800;
    margin: 8px 0 6px;
  }
  h1 .flag { font-size: 0.75em; margin-left: 8px; }
  .subtitle { color: var(--muted); margin: 0 0 18px; }
  .chips {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0;
    margin: 0 0 28px;
  }
  .chip {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    padding: 4px 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--panel);
    color: var(--muted);
    white-space: nowrap;
  }
  .chip-votes { color: var(--accent); border-color: rgba(224, 80, 58, 0.45); }
  .chip-tags { color: var(--lcd); }
  .player {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 24px;
    background: linear-gradient(180deg, var(--panel-2), var(--panel));
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: flex-start;
  }
  .play-btn {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: #fff;
    background: var(--accent);
    border: none;
    border-radius: 999px;
    padding: 14px 46px;
    cursor: pointer;
    box-shadow: 0 6px 22px rgba(224, 80, 58, 0.35);
    transition: filter 0.15s ease;
  }
  .play-btn:hover { filter: brightness(1.1); }
  .play-btn.is-playing { outline: 2px solid var(--lcd); outline-offset: 2px; }
  .player audio { width: 100%; }
  .player-hint { color: var(--muted); font-size: 13.5px; margin: 0; }
  .cta {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-top: 28px;
    padding: 13px 24px;
    border-radius: 999px;
    background: var(--lcd);
    color: #1a120b;
    font-weight: 700;
    font-size: 15px;
    text-decoration: none;
    transition: transform 0.15s ease;
  }
  .cta:hover { transform: translateY(-1px); }
  .related { margin-top: 44px; }
  .related h2 {
    font-size: 20px;
    margin: 0 0 6px;
    padding-left: 12px;
    border-left: 3px solid var(--accent);
  }
  .rel-list { list-style: none; margin: 0; padding: 0; }
  .rel-list li + li { border-top: 1px solid var(--line); }
  .rel-list a {
    display: block;
    padding: 11px 2px;
    color: var(--text);
    text-decoration: none;
    font-weight: 600;
  }
  .rel-list a:hover { color: var(--accent); }
  .rel-list a:hover .rel-meta { color: var(--muted); }
  .rel-meta {
    color: var(--muted);
    font-weight: 400;
    font-size: 13px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  footer {
    border-top: 1px solid var(--line);
    margin-top: 52px;
    padding: 18px 0 30px;
    color: var(--muted);
    font-size: 13px;
  }
  footer a { color: var(--lcd); text-decoration: none; }
  footer a:hover { text-decoration: underline; }
`;

/** Progressive-enhancement script wiring the big play button to the audio element. */
const PLAYER_SCRIPT = `
  (function () {
    var audio = document.getElementById('gr-audio');
    var button = document.getElementById('gr-play');
    if (!audio || !button) return;
    var playLabel = '▶ Play';
    var pauseLabel = '❚❚ Pause';
    button.addEventListener('click', function () {
      if (audio.paused) {
        var p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } else {
        audio.pause();
      }
    });
    audio.addEventListener('playing', function () {
      button.classList.add('is-playing');
      button.textContent = pauseLabel;
    });
    audio.addEventListener('pause', function () {
      button.classList.remove('is-playing');
      button.textContent = playLabel;
    });
  })();
`;

/**
 * Render the full SSR landing page for a station.
 * `related` should already be filtered (max 8, self excluded); it may be empty.
 */
export function renderStationPage(station: UpstreamStation, related: UpstreamStation[]): string {
  const uuid = String(station.stationuuid ?? '');
  const name = String(station.name ?? '').trim() || 'Unnamed station';
  const country =
    String(station.country ?? '').trim() ||
    String(station.countrycode ?? '').trim() ||
    'Unknown';
  const codec = String(station.codec ?? '').trim() || 'audio';
  const bitrate = Number(station.bitrate) || 0;
  const votes = Number(station.votes) || 0;
  const streamUrl = String(station.url_resolved || station.url || '');
  const canonical = SITE_ORIGIN + '/station/' + encodeURIComponent(uuid);
  const flag = countryFlagEmoji(station.countrycode);
  const globeHref = '/#/station/' + encodeURIComponent(uuid);
  const title = name + ' — Live Radio from ' + country + ' | Globe Radio';
  const description =
    'Listen to ' + name + ' live from ' + country + ' — free ' + codec +
    ' stream on Globe Radio. Spin the 3D globe to discover thousands more world radio stations.';

  // Built via JSON.stringify so it is valid JSON by construction; "<" is
  // escaped afterwards (still valid JSON) so "</script>" can never terminate
  // the tag early.
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: title,
        url: canonical,
        description: description,
      },
      {
        '@type': 'BroadcastService',
        name: name,
        description: name + ' is a live radio station streaming from ' + country + '.',
        areaServed: country,
        url: canonical,
        isLiveBroadcast: true,
        audible: streamUrl,
      },
    ],
  }).replace(/</g, '\\u003c');

  const chips: string[] = [`<li class="chip">${escapeHtml(country)}</li>`];
  chips.push(`<li class="chip">${escapeHtml(codec)}</li>`);
  if (bitrate > 0) {
    chips.push(`<li class="chip">${bitrate} kbps</li>`);
  }
  if (votes > 0) {
    chips.push(`<li class="chip chip-votes">♥ ${votes} votes</li>`);
  }
  const tagList = firstTags(station.tags, 5);
  if (tagList.length > 0) {
    chips.push(`<li class="chip chip-tags">${escapeHtml(tagList.join(', '))}</li>`);
  }

  const relatedItems = related
    .filter((s) => s && typeof s === 'object' && s.stationuuid && s.name)
    .slice(0, 8)
    .map((s) => {
      const metaBits: string[] = [];
      if (s.codec) metaBits.push(String(s.codec));
      const relatedBitrate = Number(s.bitrate) || 0;
      if (relatedBitrate > 0) metaBits.push(relatedBitrate + ' kbps');
      const meta = metaBits.length > 0
        ? ` <span class="rel-meta">· ${escapeHtml(metaBits.join(' · '))}</span>`
        : '';
      return `<li><a href="/station/${encodeURIComponent(String(s.stationuuid))}">${escapeHtml(s.name)}${meta}</a></li>`;
    })
    .join('\n');
  const relatedSection =
    relatedItems.length > 0
      ? `<section class="related">
      <h2>More from ${escapeHtml(country)}</h2>
      <ul class="rel-list">
${relatedItems}
      </ul>
    </section>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${SITE_ORIGIN}/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(title)} — live on Globe Radio">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Globe Radio">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${SITE_ORIGIN}/og-image.jpg">
  <meta name="theme-color" content="#1a120b">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;display=swap">
  <script type="application/ld+json">${jsonLd}</script>
  <style>${PAGE_CSS}</style>
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <a class="wordmark" href="/">GLOBE RADIO</a>
    </div>
  </header>
  <main class="wrap">
    <p class="kicker">Live radio · streaming now</p>
    <h1>${escapeHtml(name)}<span class="flag">${flag}</span></h1>
    <p class="subtitle">Broadcasting from ${escapeHtml(country)}</p>
    <ul class="chips">
      ${chips.join('\n      ')}
    </ul>
    <div class="player">
      <button id="gr-play" class="play-btn" type="button">▶ Play</button>
      <audio id="gr-audio" controls preload="none" src="${escapeHtml(streamUrl)}">Your browser does not support the audio element.</audio>
      <p class="player-hint">Direct ${escapeHtml(codec)} stream${bitrate > 0 ? ' at ' + bitrate + ' kbps' : ''} — press play to start listening in your browser.</p>
    </div>
    <a class="cta" href="${escapeHtml(globeHref)}">📡 Open on the 3D globe</a>
${relatedSection}
  </main>
  <footer>
    <div class="wrap">
      Powered by the <a href="https://www.radio-browser.info/">Radio Browser</a> community database · <a href="/">Globe Radio</a> · <a href="https://github.com/huanglizhuo/globe-radio">GitHub</a>
    </div>
  </footer>
  <script>${PLAYER_SCRIPT}</script>
</body>
</html>`;
}

/** Small themed 404 page for unknown / offline stations. */
export function renderStationNotFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Station not found | Globe Radio</title>
  <meta name="description" content="This radio station is offline or does not exist. Spin the 3D globe on Globe Radio to discover thousands of live world radio stations.">
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="#1a120b">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;display=swap">
  <style>${PAGE_CSS}</style>
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <a class="wordmark" href="/">GLOBE RADIO</a>
    </div>
  </header>
  <main class="wrap">
    <p class="kicker">404 · signal lost</p>
    <h1>Station not found<span class="flag">📻</span></h1>
    <p class="subtitle">This station is offline or does not exist. It may have been removed from the Radio Browser community database.</p>
    <a class="cta" href="/">🌐 Spin the 3D globe instead</a>
  </main>
  <footer>
    <div class="wrap">
      Powered by the <a href="https://www.radio-browser.info/">Radio Browser</a> community database · <a href="/">Globe Radio</a> · <a href="https://github.com/huanglizhuo/globe-radio">GitHub</a>
    </div>
  </footer>
</body>
</html>`;
}
