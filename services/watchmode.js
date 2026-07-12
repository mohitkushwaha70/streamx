const WATCHMODE_BASE = 'https://api.watchmode.com/v1';
const API_KEY = process.env.WATCHMODE_API_KEY;

const cache = {};
const CACHE_TTL = 60 * 60 * 1000;

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Watchmode ${res.status}`);
  return res.json();
}

async function searchByTmdb(tmdbId, type) {
  if (!API_KEY) return null;
  const cacheKey = `search_${type}_${tmdbId}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].time < CACHE_TTL) return cache[cacheKey].data;

  const field = type === 'movie' ? 'tmdb_movie_id' : 'tmdb_tv_id';
  const url = `${WATCHMODE_BASE}/search/?apiKey=${API_KEY}&search_field=${field}&search_value=${tmdbId}`;
  try {
    const data = await fetchJSON(url);
    const result = data?.title_results?.[0] || null;
    if (result) {
      cache[cacheKey] = { data: result, time: Date.now() };
    }
    return result;
  } catch (e) {
    console.error('Watchmode search error:', e.message);
    return null;
  }
}

async function getSources(watchmodeId, region = 'IN') {
  if (!API_KEY || !watchmodeId) return [];
  const cacheKey = `sources_${watchmodeId}_${region}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].time < CACHE_TTL) return cache[cacheKey].data;

  const url = `${WATCHMODE_BASE}/title/${watchmodeId}/sources/?apiKey=${API_KEY}&regions=${region}`;
  try {
    const data = await fetchJSON(url);
    const seen = new Set();
    const sources = (data || []).filter(s => {
      const key = `${s.source_id}_${s.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(s => ({
      id: s.source_id,
      name: s.name,
      type: s.type,
      logo: s.logo_100px || s.logo_200px || '',
      url: s.web_url || s.android_url || s.ios_url || '',
      price: s.price || null,
      format: s.format || '',
      seasons: s.seasons || [],
      episodes: s.episodes || []
    }));
    cache[cacheKey] = { data: sources, time: Date.now() };
    return sources;
  } catch (e) {
    console.error('Watchmode sources error:', e.message);
    return [];
  }
}

async function getStreamingInfo(tmdbId, type, region = 'IN') {
  const searchResult = await searchByTmdb(tmdbId, type);
  if (!searchResult) return { sources: [], watchmodeId: null };

  const sources = await getSources(searchResult.id, region);

  const grouped = {
    subscription: sources.filter(s => s.type === 'sub'),
    free: sources.filter(s => s.type === 'free'),
    rent: sources.filter(s => s.type === 'rent'),
    buy: sources.filter(s => s.type === 'buy'),
    linear: sources.filter(s => s.type === 'linear')
  };

  return { sources, grouped, watchmodeId: searchResult.id };
}

function getSourceIcon(name) {
  const icons = {
    'Netflix': '🎬', 'Amazon Prime Video': '📦', 'Prime Video': '📦',
    'Disney+': '🏰', 'Disney Plus Hotstar': '🏰', 'Hotstar': '🏰',
    'Hulu': '📺', 'HBO Max': '🎭', 'Max': '🎭',
    'Apple TV+': '🍎', 'Apple TV Plus': '🍎', 'Apple TV': '🍎',
    'YouTube': '▶️', 'Google Play Movies': '🎬', 'iTunes': '🎵',
    'Vudu': '🎥', 'Amazon Video': '📦', 'Peacock': '🦚',
    'Paramount+': '⭐', 'Paramount Plus': '⭐',
    'Crunchyroll': '🎌', 'Funimation': '🎌',
    'Sony LIV': '📺', 'ZEE5': '📺', 'JioCinema': '📱',
    'MX Player': '📱', 'VI Movies & TV': '📱',
    'Tubi': '🆓', 'Pluto TV': '🆓', 'Roku Channel': '🆓'
  };
  return icons[name] || '📺';
}

function getSourceColor(name) {
  const colors = {
    'Netflix': '#E50914', 'Amazon Prime Video': '#00A8E1', 'Prime Video': '#00A8E1',
    'Disney+': '#113CCF', 'Disney Plus Hotstar': '#113CCF', 'Hotstar': '#113CCF',
    'Hulu': '#1CE783', 'HBO Max': '#B535F6', 'Max': '#B535F6',
    'Apple TV+': '#555555', 'Apple TV Plus': '#555555',
    'YouTube': '#FF0000', 'Crunchyroll': '#F47521',
    'Sony LIV': '#000000', 'ZEE5': '#8B0000', 'JioCinema': '#0A3A7A'
  };
  return colors[name] || '#333';
}

module.exports = { searchByTmdb, getSources, getStreamingInfo, getSourceIcon, getSourceColor };
