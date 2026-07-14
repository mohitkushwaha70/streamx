const tmdb = require('./tmdb');

const EXT_RE = /\.(mp4|mkv|webm|avi|mov|flv|wmv|m4v|ts|mpd|m3u8)$/i;
const QUALITY_RE = /\b(2160p|1080p|720p|480p|4K|hd|hq)\b/gi;
const TAG_RE = /\b(web-dl|webrip|bluray|dvdrip|hdtc|cam|hdcam|proper|extended|unrated|directors?.?cut|hc|hdts|ts|tc|camrip|scr|screener|dvdscr|bdrip|brrip|remux|hevc|h264|h265|x264|x265|aac|dts|ac3|flac|mp3|10bit|hdr|sdr|dual.?audio|multi|subbed|dubbed|esubs|ssub|fsub)\b/gi;
const LANG_RE = /\b(hindi|english|dual|audio|esub|ssub|full|movie|film|org|proper)\b/gi;
const CLEAN_EXT_RE = /\.(mp4|mkv|webm|avi|mov|flv|wmv|m4v|ts|mpd|m3u8|srt|sub|idx|ass)$/i;
const QUERY_RE = /[?&].*$/;
const SEASON_EP_RE = /[Ss](\d{1,2})[Ee](\d{1,3})/;
const SEASON_RE = /[Ss](?:eason)?\s*(\d{1,2})/i;
const EP_RE = /[Ee](?:p(?:isode)?)?\s*(\d{1,3})/i;
const YEAR_RE = /[\.\s(](\d{4})[\.\s)]/;

function cleanVideoTitle(url) {
  if (!url) return '';
  try {
    let filename = url;

    // Extract from HuggingFace resolve/main paths
    const resolveMatch = filename.match(/\/resolve\/(?:main\/)?(.+)/);
    if (resolveMatch) filename = resolveMatch[1];

    // Get last path segment
    filename = filename.split('/').pop();

    // Decode URL encoding
    try { filename = decodeURIComponent(filename); } catch(e) {}
    filename = filename.replace(/\+/g, ' ');

    // Remove query params (?download=true, etc.)
    filename = filename.replace(QUERY_RE, '');

    // Remove video extensions
    filename = filename.replace(EXT_RE, '');

    // Remove quality tags
    filename = filename.replace(QUALITY_RE, '');

    // Remove encoding/source tags
    filename = filename.replace(TAG_RE, '');

    // Replace dots, underscores, hyphens with spaces
    filename = filename.replace(/[._-]+/g, ' ');

    // Remove language tags that are standalone words
    filename = filename.replace(LANG_RE, '');

    // Collapse whitespace
    filename = filename.replace(/\s+/g, ' ').trim();

    // Remove leading/trailing special chars
    filename = filename.replace(/^[\s.\-]+|[\s.\-]+$/g, '');

    // Capitalize first letter of each word
    if (filename.length > 0) {
      filename = filename.split(' ').map(w => {
        if (!w) return '';
        // Keep all-caps words like HDR, HEVC
        if (w === w.toUpperCase() && w.length <= 4) return w;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }).join(' ');
    }

    return filename || 'Untitled Video';
  } catch(e) {
    return 'Untitled Video';
  }
}

function parseFilenameParts(filename) {
  const result = { year: null, season: null, episode: null, title: filename };

  // Extract year
  const yearMatch = filename.match(YEAR_RE);
  if (yearMatch) result.year = parseInt(yearMatch[1]);

  // Extract season/episode (S01E01)
  const seMatch = filename.match(SEASON_EP_RE);
  if (seMatch) {
    result.season = parseInt(seMatch[1]);
    result.episode = parseInt(seMatch[2]);
  } else {
    // Try season alone
    const sMatch = filename.match(SEASON_RE);
    if (sMatch) result.season = parseInt(sMatch[1]);
    // Try episode alone
    const eMatch = filename.match(EP_RE);
    if (eMatch) result.episode = parseInt(eMatch[1]);
  }

  return result;
}

function detectContentType(url, title) {
  const text = (url + ' ' + title).toLowerCase();
  if (/season|episode|series|s\d+e\d+/i.test(text)) return 'series';
  if (/anime|subbed|dubbed/i.test(text) && /season|episode|s\d+e\d+/i.test(text)) return 'anime';
  return 'movie';
}

function detectGenre(url, title) {
  const text = (url + ' ' + title).toLowerCase();
  if (/action|war|fight|military|battle/i.test(text)) return 'Action';
  if (/comedy|funny|laugh|humor/i.test(text)) return 'Comedy';
  if (/horror|scary|ghost|demon|haunt/i.test(text)) return 'Horror';
  if (/romantic|love|romance/i.test(text)) return 'Romance';
  if (/sci.?fi|space|alien|future|robot/i.test(text)) return 'Sci-Fi';
  if (/thriller|suspense|crime|detective|murder/i.test(text)) return 'Thriller';
  if (/adventure|quest|journey|exploration/i.test(text)) return 'Adventure';
  if (/drama|family|life|emotional/i.test(text)) return 'Drama';
  if (/fantasy|magic|dragon|wizard/i.test(text)) return 'Fantasy';
  if (/documentary|nature|wildlife|history/i.test(text)) return 'Documentary';
  return '';
}

async function fetchTmdbMetadata(title, type) {
  if (!title || title === 'Untitled Video') return null;

  try {
    const isTv = type === 'series' || type === 'anime';
    const results = await tmdb.searchMovies(title);
    if (!results || results.length === 0) return null;

    // Find best match
    let match = null;
    const lowerTitle = title.toLowerCase();

    // Try exact title match first
    for (const r of results) {
      const rTitle = (r.title || r.name || '').toLowerCase();
      if (rTitle === lowerTitle || lowerTitle.includes(rTitle) || rTitle.includes(lowerTitle)) {
        match = r;
        break;
      }
    }

    // Fallback to first result
    if (!match) match = results[0];
    if (!match) return null;

    // Fetch full details with credits
    const details = await tmdb.getDetails(match.id, isTv, true);

    const formatted = tmdb.formatMovie(details, null);
    return {
      title: formatted.title,
      description: formatted.description,
      poster: formatted.poster,
      backdrop: formatted.backdrop,
      genre: formatted.genre,
      genres: formatted.genres,
      year: formatted.year,
      rating: formatted.rating,
      duration: formatted.duration,
      cast: formatted.cast,
      director: formatted.director,
      language: formatted.language,
      tmdbId: formatted.id
    };
  } catch(e) {
    console.error('[Metadata] TMDB fetch failed:', e.message);
    return null;
  }
}

module.exports = { cleanVideoTitle, parseFilenameParts, detectContentType, detectGenre, fetchTmdbMetadata };