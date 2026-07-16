export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  type: 'MOVIE' | 'SERIES' | 'ANIME';
  description: string;
  poster: string;
  banner: string;
  backdrop: string;
  trailerUrl?: string;
  videoUrl?: string;
  huggingFaceUrl?: string;
  genre: string;
  genres: string[];
  language: string;
  country: string;
  runtime: number;
  rating: number;
  releaseDate?: string;
  cast: string[];
  director: string;
  seasons: number;
  episodesCount: number;
  featured: boolean;
  trending: boolean;
  published: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  episodes?: Episode[];
}

export interface Episode {
  id: string;
  contentId: string;
  season: number;
  number: number;
  title: string;
  description: string;
  poster?: string;
  videoUrl?: string;
  huggingFaceUrl?: string;
  duration: number;
  rating: number;
  airDate?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PREMIUM';
  avatar?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SyncResult {
  filesFound: number;
  newFiles: number;
  errors: number;
  duration: number;
  status: string;
  message: string;
}
