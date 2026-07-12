const ARCHIVE_SEARCH = 'https://archive.org/advancedsearch.php';
const ARCHIVE_META = 'https://archive.org/metadata';
const ARCHIVE_FILES = 'https://archive.org/download';

const cache = { movies: null, time: 0 };
const CACHE_TTL = 30 * 60 * 1000;

async function fetchPopularMovies(rows = 30) {
  if (cache.movies && Date.now() - cache.time < CACHE_TTL) return cache.movies;

  const params = new URLSearchParams({
    q: 'mediatype:movies AND format:"MPEG4"',
    fl: 'identifier,title,description,year,genre,runtime,item_size',
    sort: 'item_size desc',
    rows: rows.toString(),
    output: 'json',
    page: '1'
  });

  try {
    const res = await fetch(`${ARCHIVE_SEARCH}?${params}`, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'StreamX/1.0' }
    });
    if (!res.ok) throw new Error(`Archive.org ${res.status}`);
    const data = await res.json();

    const items = (data.response?.docs || []).map(doc => ({
      id: doc.identifier,
      title: doc.title || 'Untitled',
      description: (doc.description || '').substring(0, 300),
      year: doc.year || '',
      genre: doc.genre || 'Documentary',
      runtime: doc.runtime || '',
      downloads: doc.downloads_count || 0,
      creator: doc.creator || '',
      poster: `https://archive.org/services/img/${doc.identifier}`
    }));

    cache.movies = items;
    cache.time = Date.now();
    return items;
  } catch (e) {
    console.error('Archive.org search error:', e.message);
    return [];
  }
}

async function getMovieDetails(identifier) {
  try {
    const res = await fetch(`${ARCHIVE_META}/${identifier}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'StreamX/1.0' }
    });
    if (!res.ok) throw new Error(`Archive.org meta ${res.status}`);
    const data = await res.json();

    const mp4Files = (data.files || []).filter(f =>
      f.format === 'MPEG4' && f.name.endsWith('.mp4')
    ).sort((a, b) => (b.size || 0) - (a.size || 0));

    const videoFile = mp4Files[0];
    const videoUrl = videoFile
      ? `${ARCHIVE_FILES}/${identifier}/${videoFile.name}`
      : '';

    const server = data.d1 || 'archive.org';

    return {
      id: identifier,
      title: data.metadata?.title || 'Untitled',
      description: data.metadata?.description || '',
      year: data.metadata?.year || '',
      genre: data.metadata?.genre || 'Documentary',
      runtime: data.metadata?.runtime || '',
      creator: data.metadata?.creator || '',
      poster: `${ARCHIVE_FILES}/${identifier}/__ia_thumb.jpg`,
      backdrop: data.files?.find(f => f.name.endsWith('.jpg') && f.size > 100000)
        ? `${ARCHIVE_FILES}/${identifier}/${data.files.find(f => f.name.endsWith('.jpg') && f.size > 100000).name}`
        : `${ARCHIVE_FILES}/${identifier}/__ia_thumb.jpg`,
      videoUrl,
      videoType: 'mp4',
      files: mp4Files.map(f => ({
        name: f.name,
        size: f.size,
        format: f.format,
        url: `${ARCHIVE_FILES}/${identifier}/${f.name}`
      }))
    };
  } catch (e) {
    console.error('Archive.org details error:', e.message);
    return null;
  }
}

async function searchMovies(query, rows = 20) {
  const params = new URLSearchParams({
    q: `mediatype:movies AND format:"MPEG4" AND (${query})`,
    fl: 'identifier,title,description,year,genre,runtime',
    sort: 'item_size desc',
    rows: rows.toString(),
    output: 'json',
    page: '1'
  });

  try {
    const res = await fetch(`${ARCHIVE_SEARCH}?${params}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'StreamX/1.0' }
    });
    if (!res.ok) throw new Error(`Archive.org ${res.status}`);
    const data = await res.json();

    return (data.response?.docs || []).map(doc => ({
      id: doc.identifier,
      title: doc.title || 'Untitled',
      description: (doc.description || '').substring(0, 300),
      year: doc.year || '',
      genre: doc.genre || 'Documentary',
      runtime: doc.runtime || '',
      downloads: doc.downloads_count || 0,
      poster: `https://archive.org/services/img/${doc.identifier}`
    }));
  } catch (e) {
    console.error('Archive.org search error:', e.message);
    return [];
  }
}

module.exports = { fetchPopularMovies, getMovieDetails, searchMovies };
