export interface TMDBMovie {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  media_type?: string;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  production_countries?: { iso_3166_1: string; name: string }[];
  spoken_languages?: { english_name: string; iso_639_1: string }[];
  credits?: {
    cast: { name: string }[];
    crew: { job: string; name: string }[];
  };
}

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

function headers() {
  return {
    Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
    Accept: 'application/json',
  };
}

async function fetchTMDB<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: headers(), next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller',
  10752: 'War', 37: 'Western', 10762: 'Kids', 10763: 'News',
  10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics', 10770: 'TV Movie',
};

function mapGenre(ids?: number[]): string {
  if (!ids || ids.length === 0) return '';
  return GENRE_MAP[ids[0]] || '';
}

function mapGenres(ids?: number[], genres?: { name: string }[]): string[] {
  if (genres) return genres.map((g) => g.name);
  if (ids) return ids.map((id) => GENRE_MAP[id]).filter(Boolean);
  return [];
}

function mapMovie(m: TMDBMovie, type?: string) {
  const isSeries = type === 'series' || !!m.first_air_date;
  const title = m.title || m.name || 'Untitled';
  const releaseDate = m.release_date || m.first_air_date || '';
  const year = releaseDate ? parseInt(releaseDate.substring(0, 4)) : 0;

  return {
    tmdbId: m.id,
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + m.id,
    type: isSeries ? 'SERIES' : 'MOVIE',
    description: m.overview || '',
    poster: m.poster_path ? `${TMDB_IMG}/w500${m.poster_path}` : '',
    backdrop: m.backdrop_path ? `${TMDB_IMG}/original${m.backdrop_path}` : '',
    banner: m.backdrop_path ? `${TMDB_IMG}/w1280${m.backdrop_path}` : '',
    genre: mapGenre(m.genre_ids),
    genres: mapGenres(m.genre_ids, m.genres),
    rating: m.vote_average || 0,
    runtime: m.runtime || 0,
    releaseDate: releaseDate || null,
    language: m.spoken_languages?.[0]?.iso_639_1 || 'en',
    country: m.production_countries?.[0]?.iso_3166_1 || '',
    cast: m.credits?.cast?.slice(0, 10).map((c) => c.name) || [],
    director: m.credits?.crew?.find((c) => c.job === 'Director')?.name || '',
    seasons: m.number_of_seasons || 0,
    episodesCount: m.number_of_episodes || 0,
  };
}

export async function fetchTrendingMovies() {
  const data = await fetchTMDB<{ results: TMDBMovie[] }>('/trending/movie/week');
  return data.results.map((m) => mapMovie(m, 'movie'));
}

export async function fetchTrendingSeries() {
  const data = await fetchTMDB<{ results: TMDBMovie[] }>('/trending/tv/week');
  return data.results.map((m) => mapMovie(m, 'series'));
}

export async function fetchPopularMovies(page = 1) {
  const data = await fetchTMDB<{ results: TMDBMovie[]; total_results: number }>(
    '/movie/popular', { page: String(page) }
  );
  return { results: data.results.map((m) => mapMovie(m, 'movie')), total: data.total_results };
}

export async function fetchPopularSeries(page = 1) {
  const data = await fetchTMDB<{ results: TMDBMovie[]; total_results: number }>(
    '/tv/popular', { page: String(page) }
  );
  return { results: data.results.map((m) => mapMovie(m, 'series')), total: data.total_results };
}

export async function fetchTopRatedMovies(page = 1) {
  const data = await fetchTMDB<{ results: TMDBMovie[]; total_results: number }>(
    '/movie/top_rated', { page: String(page) }
  );
  return { results: data.results.map((m) => mapMovie(m, 'movie')), total: data.total_results };
}

export async function fetchTopRatedSeries(page = 1) {
  const data = await fetchTMDB<{ results: TMDBMovie[]; total_results: number }>(
    '/tv/top_rated', { page: String(page) }
  );
  return { results: data.results.map((m) => mapMovie(m, 'series')), total: data.total_results };
}

export async function fetchMoviesByGenre(genreId: number, page = 1) {
  const data = await fetchTMDB<{ results: TMDBMovie[]; total_results: number }>(
    '/discover/movie', { with_genres: String(genreId), page: String(page), sort_by: 'popularity.desc' }
  );
  return { results: data.results.map((m) => mapMovie(m, 'movie')), total: data.total_results };
}

export async function fetchAnime(page = 1) {
  const data = await fetchTMDB<{ results: TMDBMovie[]; total_results: number }>(
    '/discover/movie', { with_genres: '16', page: String(page), sort_by: 'popularity.desc' }
  );
  const tvData = await fetchTMDB<{ results: TMDBMovie[] }>(
    '/discover/tv', { with_genres: '16', page: String(page), sort_by: 'popularity.desc' }
  );
  const movies = data.results.map((m) => mapMovie(m, 'anime'));
  const series = tvData.results.map((m) => mapMovie(m, 'anime'));
  return { results: [...movies, ...series], total: data.total_results };
}

export async function fetchDetails(tmdbId: number, type: 'movie' | 'tv') {
  const append = type === 'tv' ? 'content_ratings,keywords,credits' : 'release_dates,keywords,credits';
  return fetchTMDB<TMDBMovie & { seasons?: { season_number: number; name: string; episode_count: number }[] }>(
    `/${type}/${tmdbId}`, { append_to_response: append }
  );
}

export async function fetchSeasonEpisodes(tmdbId: number, season: number) {
  return fetchTMDB<{
    episodes: {
      id: number; episode_number: number; season_number: number; name: string;
      overview: string; still_path: string | null; air_date: string; vote_average: number;
    }[];
  }>(`/tv/${tmdbId}/season/${season}`);
}

export async function searchTMDB(query: string) {
  const data = await fetchTMDB<{ results: TMDBMovie[] }>('/search/multi', { query, include_adult: 'false' });
  return data.results
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((m) => mapMovie(m, m.media_type === 'tv' ? 'series' : 'movie'));
}

export { TMDB_IMG, GENRE_MAP };
