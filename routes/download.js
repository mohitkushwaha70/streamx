const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { movies: sampleMovies, series: sampleSeries } = require('../data/sample');
const { fetchMovies, fetchSeries } = require('../services/tmdb');

let videoConfig = {};
function reloadVideoConfig() {
  try { videoConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'videos.json'), 'utf8')).videos || {}; } catch (e) {}
}
reloadVideoConfig();
}

function toProxyUrl(hfUrl) {
  if (!hfUrl) return '';
  let match = hfUrl.match(/\/resolve\/main\/(.+)/);
  if (!match) match = hfUrl.match(/\/resolve\/(.+)/);
  if (match) return `/stream/${decodeURIComponent(match[1])}`;
  return hfUrl;
}

function getVideoSources(type, tmdbId) {
  const key = String(tmdbId);
  if (videoConfig[key]) {
    const cfg = videoConfig[key];
    const sources = {};
    if (cfg.sources) {
      for (const [quality, url] of Object.entries(cfg.sources)) {
        sources[quality] = toProxyUrl(url);
      }
    }
    return { ...cfg, sources };
  }

  const storageBase = process.env.VIDEO_STORAGE_BASE || '';
  if (storageBase) {
    return {
      sources: {
        '1080p': `/stream/${type}/${tmdbId}-1080p.mp4`,
        '720p': `/stream/${type}/${tmdbId}-720p.mp4`
      }
    };
  }
  return null;
}

async function findItem(type, id) {
  const itemId = parseInt(id);
  if (type === 'movie') {
    const tmdbMovies = await fetchMovies().catch(() => null);
    let allMovies = [...(tmdbMovies || []), ...sampleMovies];
    for (const tmdbId of Object.keys(videoConfig).filter(k => !isNaN(k)).map(Number)) {
      if (!allMovies.find(m => (m.tmdbId || m.id) === tmdbId)) {
        const cfg = videoConfig[tmdbId];
        allMovies.push({ id: tmdbId, tmdbId, title: cfg.title, genre: cfg.genre, year: cfg.year, poster: cfg.poster, premium: false });
      }
    }
    return allMovies.find(m => m.id === itemId || m.tmdbId === itemId) || null;
  } else {
    const tmdbSeries = await fetchSeries().catch(() => null);
    const allSeries = [...(tmdbSeries || []), ...sampleSeries];
    return allSeries.find(s => s.id === itemId || s.tmdbId === itemId) || null;
  }
}

router.get('/:type/:id', async (req, res) => {
  reloadVideoConfig();
  const { type, id } = req.params;
  if (type !== 'movie' && type !== 'series') return res.redirect('/');

  const item = await findItem(type, id);
  if (!item) return res.redirect('/');

  const tmdbId = item.tmdbId || item.id;
  const videoInfo = getVideoSources(type, tmdbId);

  const qualities = [
    { label: '4K Ultra HD', resolution: '2160p', size: '~8 GB', tag: 'ultra', available: false, url: '' },
    { label: 'Full HD', resolution: '1080p', size: '~2.5 GB', tag: 'hd', available: false, url: '' },
    { label: 'HD', resolution: '720p', size: '~1.2 GB', tag: '720', available: false, url: '' },
    { label: 'SD', resolution: '480p', size: '~600 MB', tag: 'sd', available: false, url: '' },
  ];

  if (videoInfo && videoInfo.sources) {
    const src = videoInfo.sources;
    if (src['2160p'] || src['4k']) { qualities[0].available = true; qualities[0].url = src['2160p'] || src['4k']; }
    if (src['1080p']) { qualities[1].available = true; qualities[1].url = src['1080p']; }
    if (src['720p']) { qualities[2].available = true; qualities[2].url = src['720p']; }
    if (src['480p']) { qualities[3].available = true; qualities[3].url = src['480p']; }
  }

  const episodes = [];
  if (type === 'series' && item.seasons) {
    for (let s = 1; s <= (item.seasons || 1); s++) {
      const eps = item.episodeList || [];
      eps.filter(e => e.season === s).forEach(ep => {
        const epKey = `${tmdbId}-s${s}e${ep.number}`;
        const epVideo = videoConfig[epKey];
        let downloadUrl = '';
        if (epVideo?.sources?.['1080p']) downloadUrl = toProxyUrl(epVideo.sources['1080p']);
        else if (epVideo?.sources?.['720p']) downloadUrl = toProxyUrl(epVideo.sources['720p']);
        episodes.push({ ...ep, season: s, downloadUrl });
      });
    }
  }

  res.render('download', {
    item, type, qualities, episodes,
    page: 'download'
  });
});

module.exports = router;
