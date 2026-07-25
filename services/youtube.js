const YOUTUBE_SEARCH = 'https://www.googleapis.com/youtube/v3/search';
const API_KEY = process.env.YOUTUBE_API_KEY || '';

const cache = {};
const CACHE_TTL = 30 * 60 * 1000;

const GENRE_QUERIES = [
  'full movie english',
  'full action movie',
  'full horror movie',
  'full comedy movie',
  'full sci-fi movie',
  'full thriller movie',
  'classic full movie'
];

async function searchFullMovies(query = 'full movie', maxResults = 20) {
  if (!API_KEY) return getFallbackMovies();

  const cacheKey = `yt_${query}_${maxResults}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].time < CACHE_TTL) return cache[cacheKey].data;

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      videoDuration: 'long',
      videoEmbeddable: 'true',
      maxResults: maxResults.toString(),
      order: 'viewCount',
      key: API_KEY
    });

    const res = await fetch(`${YOUTUBE_SEARCH}?${params}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(`YouTube ${res.status}`);
    const data = await res.json();

    const movies = (data.items || []).map(item => ({
      id: item.id.videoId,
      title: cleanTitle(item.snippet.title),
      description: item.snippet.description?.substring(0, 300) || '',
      channel: item.snippet.channelTitle || '',
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
      publishedAt: item.snippet.publishedAt || '',
      videoUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
      videoType: 'youtube'
    })).filter(m => m.id);

    cache[cacheKey] = { data: movies, time: Date.now() };
    return movies;
  } catch (e) {
    console.error('YouTube search error:', e.message);
    return getFallbackMovies();
  }
}

async function searchByGenre(genre, maxResults = 15) {
  const query = `full ${genre.toLowerCase()} movie`;
  return searchFullMovies(query, maxResults);
}

function cleanTitle(title) {
  return title
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/full movie/gi, '')
    .replace(/watch now/gi, '')
    .replace(/free/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFallbackMovies() {
  return [
    { id: 'f0nJz1Kd7-0', title: 'Big Buck Bunny', description: 'A large and lovable rabbit deals with three tiny bullies.', channel: 'Blender Foundation', thumbnail: 'https://img.youtube.com/vi/f0nJz1Kd7-0/hqdefault.jpg', videoUrl: 'https://www.youtube.com/embed/f0nJz1Kd7-0', videoType: 'youtube' },
    { id: 'YE7VzlLtp-4', title: 'Sintel', description: 'A lonely young woman searches for her baby dragon.', channel: 'Blender Foundation', thumbnail: 'https://img.youtube.com/vi/YE7VzlLtp-4/hqdefault.jpg', videoUrl: 'https://www.youtube.com/embed/YE7VzlLtp-4', videoType: 'youtube' },
    { id: 'ePm7Ejyp9q4', title: 'Tears of Steel', description: 'A group of warriors must save Amsterdam from a robot apocalypse.', channel: 'Blender Foundation', thumbnail: 'https://img.youtube.com/vi/ePm7Ejyp9q4/hqdefault.jpg', videoUrl: 'https://www.youtube.com/embed/ePm7Ejyp9q4', videoType: 'youtube' },
    { id: 'kNs6UH8pPCk', title: 'Cospaces - Sci-Fi Short Film', description: 'A sci-fi adventure short film.', channel: 'CinePunk', thumbnail: 'https://img.youtube.com/vi/kNs6UH8pPCk/hqdefault.jpg', videoUrl: 'https://www.youtube.com/embed/kNs6UH8pPCk', videoType: 'youtube' },
    { id: 'dpjY0d53jBk', title: 'The Third Floor - Short Film', description: 'A psychological thriller short film.', channel: 'Short of the Week', thumbnail: 'https://img.youtube.com/vi/dpjY0d53jBk/hqdefault.jpg', videoUrl: 'https://www.youtube.com/embed/dpjY0d53jBk', videoType: 'youtube' }
  ];
}

module.exports = { searchFullMovies, searchByGenre, getFallbackMovies };
