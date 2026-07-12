const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const cache = {
  movies: null, moviesLastFetch: 0,
  series: null, seriesLastFetch: 0,
  anime: null, animeLastFetch: 0,
  trending: null, trendingLastFetch: 0,
  seasonEpisodes: new Map()
};
const CACHE_TTL = 30 * 60 * 1000;
const SEASON_CACHE_TTL = 60 * 60 * 1000;

const inFlight = new Map();

const TMDB_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;

function headers() {
  return {
    'Authorization': `Bearer ${TMDB_TOKEN}`,
    'Accept': 'application/json'
  };
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const body = await res.text().catch(() => 'unable to read body');
    console.error(`TMDB API Error: ${res.status} ${res.statusText} | URL: ${url} | Body: ${body}`);
    throw new Error(`TMDB ${res.status}: ${url} - ${body.substring(0, 200)}`);
  }
  return res.json();
}

async function dedupe(key, fn) {
  if (inFlight.has(key)) return inFlight.get(key);
  const p = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function getTrailer(movieId, isTv) {
  try {
    const type = isTv ? 'tv' : 'movie';
    const data = await fetchJSON(`${TMDB_BASE}/${type}/${movieId}/videos?language=en-US`);
    const trailer = data.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')
      || data.results?.find(v => v.site === 'YouTube')
      || data.results?.[0];
    return trailer ? trailer.key : null;
  } catch { return null; }
}

async function getTrending(mediaType) {
  const data = await fetchJSON(`${TMDB_BASE}/trending/${mediaType}/week?language=en-US`);
  return data.results || [];
}

async function getTopRated(mediaType) {
  const data = await fetchJSON(`${TMDB_BASE}/${mediaType}/top_rated?language=en-US&page=1`);
  return data.results || [];
}

async function getPopular(mediaType) {
  const data = await fetchJSON(`${TMDB_BASE}/${mediaType}/popular?language=en-US&page=1`);
  return data.results || [];
}

async function getNowPlaying(mediaType) {
  const data = await fetchJSON(`${TMDB_BASE}/${mediaType}/now_playing?language=en-US&page=1`);
  return data.results || [];
}

async function getUpcoming(mediaType) {
  const data = await fetchJSON(`${TMDB_BASE}/${mediaType}/upcoming?language=en-US&page=1`);
  return data.results || [];
}

async function getDetails(id, isTv, includeCredits = true) {
  const type = isTv ? 'tv' : 'movie';
  const params = includeCredits ? '?language=en-US&append_to_response=credits' : '?language=en-US';
  return fetchJSON(`${TMDB_BASE}/${type}/${id}${params}`);
}

async function getGenreList(mediaType) {
  const data = await fetchJSON(`${TMDB_BASE}/genre/${mediaType}/list?language=en-US`);
  return data.genres || [];
}

async function discoverByGenre(mediaType, genreId, page = 1) {
  const data = await fetchJSON(`${TMDB_BASE}/discover/${mediaType}?with_genres=${genreId}&sort_by=popularity.desc&page=${page}&language=en-US`);
  return data.results || [];
}

async function getPersonDetails(personId) {
  return fetchJSON(`${TMDB_BASE}/person/${personId}?language=en-US`);
}

async function fetchSeasonEpisodes(tmdbId, seasonNumber) {
  const key = `${tmdbId}-s${seasonNumber}`;
  const cached = cache.seasonEpisodes.get(key);
  if (cached && Date.now() - cached.time < SEASON_CACHE_TTL) return cached.data;

  try {
    const data = await fetchJSON(`${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}?language=en-US`);
    const episodes = (data.episodes || []).map(ep => ({
      number: ep.episode_number,
      season: ep.season_number,
      title: ep.name || `Episode ${ep.episode_number}`,
      duration: ep.runtime ? `${ep.runtime}m` : '',
      description: ep.overview || '',
      poster: ep.still_path ? `${TMDB_IMG}/w300${ep.still_path}` : '',
      airDate: ep.air_date || '',
      rating: ep.vote_average ? ep.vote_average.toFixed(1) : ''
    }));
    cache.seasonEpisodes.set(key, { data: episodes, time: Date.now() });
    return episodes;
  } catch { return []; }
}

function formatMovie(m, trailerKey) {
  const duration = m.runtime ? `${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m` : '';
  const seasons = m.number_of_seasons || 0;
  const episodes = m.number_of_episodes || 0;
  const director = m.credits?.crew?.find(c => c.job === 'Director')?.name || '';
  const cast = m.credits?.cast?.slice(0, 3).map(c => c.name).join(', ') || '';
  const genre = m.genres?.[0]?.name || '';
  const genres = (m.genres || []).map(g => g.name);
  const year = (m.release_date || m.first_air_date || '').slice(0, 4);
  const backdrop = m.backdrop_path ? `${TMDB_IMG}/original${m.backdrop_path}` : '';
  const poster = m.poster_path ? `${TMDB_IMG}/w500${m.poster_path}` : '';
  const voteCount = m.vote_count || 0;

  let videoUrl = '';
  if (trailerKey) {
    videoUrl = `https://www.youtube.com/embed/${trailerKey}?autoplay=0&rel=0`;
  } else {
    videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }

  let videoType = trailerKey ? 'youtube' : 'mp4';

  return {
    id: m.id,
    tmdbId: m.id,
    title: m.title || m.name || 'Untitled',
    genre,
    genres,
    year: parseInt(year) || 2026,
    rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 7.0,
    voteCount,
    duration: duration || (seasons > 0 ? `${seasons} Season${seasons > 1 ? 's' : ''}` : ''),
    premium: m.vote_average >= 7.5,
    badge: m.vote_average >= 8.5 ? 'top' : (year === '2026' || year === '2025') ? 'new' : '',
    description: m.overview || 'No description available.',
    poster,
    backdrop: backdrop || poster,
    videoUrl,
    videoType,
    trailerKey: trailerKey || '',
    cast,
    director,
    language: m.original_language || 'en',
    popularity: m.popularity || 0,
    releaseDate: m.release_date || m.first_air_date || '',
    seasons: seasons || undefined,
    episodes: episodes || undefined
  };
}

async function fetchMovies() {
  if (cache.movies && Date.now() - cache.moviesLastFetch < CACHE_TTL) return cache.movies;

  return dedupe('movies', async () => {
    try {
      const [trending, topRated, popular] = await Promise.all([
        getTrending('movie'),
        getTopRated('movie'),
        getPopular('movie')
      ]);

      const allIds = new Set();
      const merged = [...trending, ...topRated, ...popular].filter(m => {
        if (allIds.has(m.id)) return false;
        allIds.add(m.id);
        return true;
      }).slice(0, 30);

      const trailers = await Promise.all(merged.map(m => getTrailer(m.id, false)));

      const movies = merged.map((m, i) => formatMovie(m, trailers[i]));

      cache.movies = movies;
      cache.moviesLastFetch = Date.now();
      return movies;
    } catch (e) {
      console.error('TMDB fetch error:', e.message);
      return null;
    }
  });
}

async function fetchSeries() {
  if (cache.series && Date.now() - cache.seriesLastFetch < CACHE_TTL) return cache.series;

  return dedupe('series', async () => {
    try {
      const [trending, topRated, popular] = await Promise.all([
        getTrending('tv'),
        getTopRated('tv'),
        getPopular('tv')
      ]);

      const allIds = new Set();
      const merged = [...trending, ...topRated, ...popular].filter(s => {
        if (allIds.has(s.id)) return false;
        allIds.add(s.id);
        return true;
      }).slice(0, 25);

      const [trailers, details] = await Promise.all([
        Promise.all(merged.map(s => getTrailer(s.id, true))),
        Promise.all(merged.map(s => getDetails(s.id, true, false).catch(() => s)))
      ]);

      const series = merged.map((s, i) => formatMovie(details[i], trailers[i]));

      cache.series = series;
      cache.seriesLastFetch = Date.now();
      return series;
    } catch (e) {
      console.error('TMDB series fetch error:', e.message);
      return null;
    }
  });
}

async function fetchTrendingAll() {
  if (cache.trending && Date.now() - cache.trendingLastFetch < CACHE_TTL) return cache.trending;

  return dedupe('trending', async () => {
    try {
      const [moviesT, tvT, moviesP, tvP] = await Promise.all([
        getTrending('movie'),
        getTrending('tv'),
        getPopular('movie'),
        getPopular('tv')
      ]);

      const allIds = new Set();
      const all = [...moviesT, ...tvT, ...moviesP, ...tvP].filter(item => {
        if (allIds.has(item.id)) return false;
        allIds.add(item.id);
        return true;
      });

      cache.trending = all;
      cache.trendingLastFetch = Date.now();
      return all;
    } catch (e) {
      console.error('TMDB trending fetch error:', e.message);
      return [];
    }
  });
}

async function fetchGenreStats() {
  try {
    const [movieGenres, tvGenres] = await Promise.all([
      getGenreList('movie'),
      getGenreList('tv')
    ]);

    const genreMap = new Map();
    [...movieGenres, ...tvGenres].forEach(g => {
      if (!genreMap.has(g.id)) genreMap.set(g.id, g.name);
    });

    return { movieGenres, tvGenres, genreMap: Object.fromEntries(genreMap) };
  } catch (e) {
    console.error('TMDB genre fetch error:', e.message);
    return { movieGenres: [], tvGenres: [], genreMap: {} };
  }
}

async function searchMovies(query) {
  try {
    const data = await fetchJSON(`${TMDB_BASE}/search/multi?query=${encodeURIComponent(query)}&language=en-US&page=1`);
    return (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 10);
  } catch { return []; }
}

module.exports = {
  fetchMovies, fetchSeries, fetchTrendingAll, fetchGenreStats,
  searchMovies, getDetails, getTrailer, fetchSeasonEpisodes,
  getTrending, getTopRated, getPopular, getNowPlaying, getUpcoming,
  getGenreList, discoverByGenre, getPersonDetails,
  formatMovie, TMDB_IMG
};
