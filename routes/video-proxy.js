const express = require('express');
const router = express.Router();

const HF_REPO = 'mohit8287kushwaha/streamx-videos';
const HF_BASE = `https://huggingface.co/datasets/${HF_REPO}/resolve/main`;
const HF_TOKEN = process.env.HF_TOKEN || '';

router.get('/*', async (req, res) => {
  const filePath = req.params[0];
  if (!filePath) return res.status(400).send('No file path');

  const cleanPath = filePath.replace(/^\/+/, '');
  const url = `${HF_BASE}/${cleanPath}`;

  const headers = {};
  if (HF_TOKEN) {
    headers['Authorization'] = `Bearer ${HF_TOKEN}`;
  }

  try {
    const range = req.headers.range;
    if (range) {
      headers['Range'] = range;
    }

    const upstream = await fetch(url, { headers });
    if (!upstream.ok) {
      return res.status(upstream.status).send(`Video not found: ${cleanPath}`);
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');

    const resHeaders = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    };
    if (contentLength) resHeaders['Content-Length'] = contentLength;
    if (contentRange) resHeaders['Content-Range'] = contentRange;

    const status = range && contentRange ? 206 : 200;
    res.writeHead(status, resHeaders);

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    };
    pump().catch(() => res.end());
  } catch (e) {
    console.error('Video proxy error:', e.message);
    res.status(500).send('Stream error');
  }
});

module.exports = router;
