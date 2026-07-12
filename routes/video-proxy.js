const express = require('express');
const router = express.Router();

const HF_DATASET = 'mohit8287kushwaha/Mohit8287kushwahaStreamxvedios';
const HF_DATASET_BASE = `https://huggingface.co/datasets/${HF_DATASET}/resolve/main`;
const HF_TOKEN = process.env.HF_TOKEN || '';

async function resolveUrl(url) {
  const headers = {};
  if (HF_TOKEN) headers['Authorization'] = `Bearer ${HF_TOKEN}`;
  const resp = await fetch(url, { headers, redirect: 'manual' });
  if (resp.status === 302 || resp.status === 301) {
    return resp.headers.get('location');
  }
  return url;
}

router.get('/*', async (req, res) => {
  const filePath = req.params[0];
  if (!filePath) return res.status(400).send('No file path');

  const cleanPath = decodeURIComponent(filePath.replace(/^\/+/, ''));

  try {
    const encodedPath = encodeURIComponent(cleanPath).replace(/%2F/g, '/');
    const hfUrl = `${HF_DATASET_BASE}/${encodedPath}`;
    const cdnUrl = await resolveUrl(hfUrl);

    const headers = {};
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const upstream = await fetch(cdnUrl, { headers });
    if (!upstream.ok) {
      return res.status(upstream.status).send(`Video not found: ${cleanPath}`);
    }

    let contentType = upstream.headers.get('content-type') || '';
    if (!contentType || contentType === 'application/octet-stream' || contentType === 'text/plain') {
      if (cleanPath.endsWith('.mkv')) contentType = 'video/x-matroska';
      else if (cleanPath.endsWith('.mp4')) contentType = 'video/mp4';
      else if (cleanPath.endsWith('.webm')) contentType = 'video/webm';
      else contentType = 'video/mp4';
    }

    const resHeaders = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    };

    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    if (contentLength) resHeaders['Content-Length'] = contentLength;
    if (contentRange) resHeaders['Content-Range'] = contentRange;

    const status = req.headers.range && contentRange ? 206 : 200;
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
