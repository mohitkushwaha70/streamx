const express = require('express');
const router = express.Router();
const db = require('../services/database');

function toProxyUrl(hfUrl) {
  if (!hfUrl) return '';
  let match = hfUrl.match(/\/resolve\/main\/(.+)/);
  if (!match) match = hfUrl.match(/\/resolve\/(.+)/);
  if (match) return `/stream/${decodeURIComponent(match[1])}`;
  return hfUrl;
}

router.get('/:type/:id', (req, res) => {
  const { type, id } = req.params;
  if (!['movie', 'series', 'anime'].includes(type)) return res.redirect('/');
  if (!req.session.user) return res.redirect('/auth/login');

  const item = db.content.findById(parseInt(id));
  if (!item) return res.redirect('/');

  if (item.premium && req.session.user.plan !== 'premium') {
    req.session.error = 'This is premium content. Upgrade to Premium!';
    return res.redirect('/pricing');
  }

  let videoUrl = item.video_url || '';
  if (videoUrl && videoUrl.includes('huggingface.co')) {
    videoUrl = toProxyUrl(videoUrl);
  }

  const qualities = [
    { label: 'Full HD', resolution: '1080p', size: '~2.5 GB', tag: 'hd', available: !!videoUrl, url: videoUrl },
    { label: 'HD', resolution: '720p', size: '~1.2 GB', tag: '720', available: false, url: '' },
    { label: 'SD', resolution: '480p', size: '~600 MB', tag: 'sd', available: false, url: '' },
  ];

  let episodes = [];
  if (item.type === 'series' || item.type === 'anime') {
    episodes = db.episodes.findByContent(item.id);
    episodes.forEach(ep => {
      if (ep.video_url && ep.video_url.includes('huggingface.co')) {
        ep.downloadUrl = toProxyUrl(ep.video_url);
      } else {
        ep.downloadUrl = ep.video_url || '';
      }
    });
  }

  res.render('download', { item, type: item.type, qualities, episodes, page: 'download' });
});

module.exports = router;
