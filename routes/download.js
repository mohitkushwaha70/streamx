const express = require('express');
const router = express.Router();
const { movies: sampleMovies, series: sampleSeries } = require('../data/sample');
const { fetchMovies, fetchSeries } = require('../services/tmdb');

const VIDEO_STORAGE_BASE = process.env.VIDEO_STORAGE_URL || '';

async function findItem(type, id) {
  const itemId = parseInt(id);
  if (type === 'movie') {
    const tmdbMovies = await fetchMovies().catch(() => null);
    const allMovies = [...(tmdbMovies || []), ...sampleMovies];
    return allMovies.find(m => m.id === itemId || m.tmdbId === itemId) || null;
  } else {
    const tmdbSeries = await fetchSeries().catch(() => null);
    const allSeries = [...(tmdbSeries || []), ...sampleSeries];
    return allSeries.find(s => s.id === itemId || s.tmdbId === itemId) || null;
  }
}

router.get('/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  if (type !== 'movie' && type !== 'series') return res.redirect('/');

  const item = await findItem(type, id);
  if (!item) return res.redirect('/');

  const qualities = [
    { label: '4K Ultra HD', resolution: '2160p', size: '~8 GB', tag: 'ultra', available: false },
    { label: 'Full HD', resolution: '1080p', size: '~2.5 GB', tag: 'hd', available: false },
    { label: 'HD', resolution: '720p', size: '~1.2 GB', tag: '720', available: false },
    { label: 'SD', resolution: '480p', size: '~600 MB', tag: 'sd', available: false },
  ];

  const storageUrl = item.videoStorageUrl || item.videoUrl || '';
  if (storageUrl) {
    qualities[1].available = true;
    qualities[1].url = storageUrl;
    qualities[3].available = true;
    qualities[3].url = storageUrl;
  }

  const episodes = [];
  if (type === 'series' && item.seasons) {
    for (let s = 1; s <= (item.seasons || 1); s++) {
      const eps = item.episodeList || [];
      eps.filter(e => e.season === s).forEach(ep => {
        episodes.push({ ...ep, season: s });
      });
    }
  }

  res.render('download', {
    item, type, qualities, episodes,
    page: 'download'
  });
});

module.exports = router;
