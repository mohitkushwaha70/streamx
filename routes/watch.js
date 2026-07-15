const express = require('express');
const router = express.Router();
const db = require('../services/database');

const HF_OUR_DATASET = 'mohit8287kushwaha/Mohit8287kushwahaStreamxvedios';

function cleanUrl(url) {
  if (!url) return '';
  return url.replace(/\?download=true$/i, '').replace(/[?&]download=true$/i, '');
}

function isOursDataset(url) {
  return url.includes(HF_OUR_DATASET);
}

function toProxyUrl(url) {
  if (!url) return url;
  url = cleanUrl(url);
  if (!url.includes('huggingface.co')) return url;

  if (isOursDataset(url)) {
    let match = url.match(/\/resolve\/main\/(.+)/);
    if (!match) match = url.match(/\/resolve\/(.+)/);
    if (match) return `/stream/${decodeURIComponent(match[1])}`;
    return url;
  }

  return `/stream/hf/${encodeURIComponent(url)}`;
}

router.get('/:type/:id', (req, res) => {
  if (!req.session.user) {
    req.session.error = 'Please sign in to watch content';
    return res.redirect('/auth/login');
  }

  if (!req.session.user.plan_chosen) {
    req.session.error = 'Please choose a plan to start watching';
    return res.redirect('/auth/choose-plan');
  }

  const { type, id } = req.params;
  const itemId = parseInt(id);
  const ep = parseInt(req.query.ep) || 1;
  const season = parseInt(req.query.season) || 1;

  let item = db.content.findById(itemId);
  if (!item && type) item = db.content.findByTmdbId(itemId, type);
  if (!item) return res.redirect('/');

  if (item.premium && req.session.user.plan !== 'premium') {
    req.session.error = 'This is premium content. Upgrade to Premium to watch!';
    return res.redirect('/pricing');
  }

  // Check video URL from content record
  let videoUrl = cleanUrl(item.video_url || '');

  // Also check video_configs table (may have been set via admin)
  const videoCfg = db.videoConfigs.get(item.tmdb_id);
  if (videoCfg && videoCfg.sources) {
    const sources = Object.values(videoCfg.sources);
    if (sources.length > 0) {
      videoUrl = toProxyUrl(sources[0]) || videoUrl;
    }
  }

  // Apply proxy only to our dataset HuggingFace URLs, pass others direct
  if (videoUrl && videoUrl.includes('huggingface.co')) {
    videoUrl = toProxyUrl(videoUrl);
  }

  // Update item with resolved video URL
  item.videoUrl = videoUrl;

  // Track continue watching
  if (req.session.user) {
    db.continueWatching.upsert(
      req.session.user.id, item.tmdb_id || item.id, item.type === 'series' ? 'series' : 'movie',
      item.title, item.poster, item.genre, item.duration || (item.seasons ? item.seasons + ' Seasons' : ''),
      0
    );
  }

  // Load episodes for series
  let episodes = [];
  let currentEpisode = null;
  if (item.type === 'series' || item.type === 'anime') {
    episodes = db.episodes.findByContent(item.id);
    // Proxy episode video URLs - clean download=true from all, proxy only our dataset
    episodes.forEach(e => {
      e.videoUrl = cleanUrl(e.video_url || '');
      if (e.videoUrl && e.videoUrl.includes('huggingface.co')) {
        e.videoUrl = toProxyUrl(e.videoUrl);
      }
    });
    currentEpisode = episodes.find(e => e.number === ep) || episodes[0] || null;
    if (currentEpisode) {
      // Use episode video URL if available
      if (currentEpisode.videoUrl) {
        item.videoUrl = currentEpisode.videoUrl;
      }
    }
  }

  // Related content
  const related = db.content.list(item.type, { genre: item.genre, limit: 8 }).items.filter(m => m.id !== item.id);

  // Trending across all types
  const trending = db.content.getAll().sort((a, b) => b.rating - a.rating).slice(0, 8);

  const shareUrl = `${req.protocol}://${req.get('host')}/watch/${item.type}/${item.id}`;

  res.render('player', {
    item, type: item.type, related, episodes, currentEpisode, ep, trending,
    totalSeasons: item.seasons || 1, currentSeason: season, shareUrl,
    streaming: {}
  });
});

module.exports = router;
