const express = require('express');
const router = express.Router();
const { series: sampleSeries } = require('../data/sample');
const { fetchSeries, TMDB_IMG } = require('../services/tmdb');

const TMDB_BASE = 'https://api.themoviedb.org/3';

function headers() {
  return {
    'Authorization': `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
    'accept': 'application/json'
  };
}

async function fetchSeasonEpisodes(tmdbId, seasonNumber) {
  try {
    const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}?language=en-US`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.episodes || []).map(ep => ({
      number: ep.episode_number,
      season: ep.season_number,
      title: ep.name || `Episode ${ep.episode_number}`,
      duration: ep.runtime ? `${ep.runtime}m` : '',
      description: ep.overview || '',
      poster: ep.still_path ? `${TMDB_IMG}/w300${ep.still_path}` : '',
      airDate: ep.air_date || '',
      rating: ep.vote_average ? ep.vote_average.toFixed(1) : ''
    }));
  } catch { return []; }
}

async function fetchShowDetails(tmdbId) {
  try {
    const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}?language=en-US&append_to_response=content_ratings,keywords`, { headers: headers() });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

router.get('/', async (req, res) => {
  const tmdbSeries = await fetchSeries().catch(() => null);
  const tmdbIds = new Set((tmdbSeries || []).map(s => s.tmdbId || s.id));
  const localOnly = sampleSeries.filter(s => !tmdbIds.has(s.id));
  const allSeries = [...(tmdbSeries || []), ...localOnly];

  const genre = req.query.genre || '';
  let filtered = genre ? allSeries.filter(s => s.genre.toLowerCase() === genre.toLowerCase()) : [...allSeries];
  const genres = [...new Set(allSeries.map(s => s.genre))];
  res.render('series-list', { series: filtered, genres, currentGenre: genre });
});

router.get('/:id', async (req, res) => {
  const tmdbSeries = await fetchSeries().catch(() => null);
  const tmdbIds = new Set((tmdbSeries || [])  .map(s => s.tmdbId || s.id));
  const localOnly = sampleSeries.filter(s => !tmdbIds.has(s.id));
  const allSeries = [...(tmdbSeries || []), ...localOnly];

  const show = allSeries.find(s => s.id === parseInt(req.params.id) || s.tmdbId === parseInt(req.params.id));
  if (!show) return res.redirect('/series');

  let episodes = show.episodeList || [];
  const tmdbId = show.tmdbId || show.id;

  if (episodes.length === 0 && show.seasons) {
    const season = parseInt(req.query.season) || 1;
    episodes = await fetchSeasonEpisodes(tmdbId, season);
  }

  const showDetails = await fetchShowDetails(tmdbId).catch(() => null);
  const seasonsList = showDetails?.seasons || [];

  const related = allSeries.filter(s => s.genre === show.genre && s.id !== show.id).slice(0, 8);
  res.render('detail', { item: { ...show, episodes, seasonsList }, type: 'series', related });
});

module.exports = router;
