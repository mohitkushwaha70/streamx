const express = require('express');
const router = express.Router();
const db = require('../services/database');

const HF_DATASET = 'mohit8287kushwaha/Mohit8287kushwahaStreamxvedios';
const HF_DATASET_BASE = `https://huggingface.co/datasets/${HF_DATASET}/resolve/main`;
const HF_TOKEN = process.env.HF_TOKEN || '';

const clientHits = new Map();
setInterval(() => clientHits.clear(), 60000);

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
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Login required to stream' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
  const hits = (clientHits.get(ip) || 0) + 1;
  clientHits.set(ip, hits);
  if (hits > 30) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const filePath = req.params[0];
  if (!filePath) return res.status(400).send('No file path');

  const cleanPath = decodeURIComponent(filePath.replace(/^\/+/, '').split('?')[0]);

  try {
    const encodedPath = encodeURIComponent(cleanPath).replace(/%2F/g, '/');
    const hfUrl = `${HF_DATASET_BASE}/${encodedPath}`;
    const cdnUrl = await resolveUrl(hfUrl);

    const headers = {};
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const upstream = await fetch(cdnUrl, {
      headers,
      signal: AbortSignal.timeout(60000)
    });
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
    };

    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    if (contentLength) resHeaders['Content-Length'] = contentLength;
    if (contentRange) resHeaders['Content-Range'] = contentRange;

    const status = req.headers.range && contentRange ? 206 : 200;
    res.writeHead(status, resHeaders);

    const reader = upstream.body.getReader();
    let aborted = false;
    req.on('close', () => { aborted = true; try { reader.cancel(); } catch(e) {} });

    const pump = async () => {
      while (!aborted) {
        const { done, value } = await reader.read();
        if (done || aborted) break;
        if (!res.write(value)) {
          await new Promise(r => res.once('drain', r));
        }
      }
      res.end();
    };
    pump().catch(() => { try { res.end(); } catch(e) {} });
  } catch (e) {
    console.error('Video proxy error:', e.message);
    res.status(500).send('Stream error');
  }
});

module.exports = router;
