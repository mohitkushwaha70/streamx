'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { ContentCard } from '@/components/ui/content-card';
import { SearchFilters } from '@/components/ui/search-filters';
import type { ContentItem, PaginatedResponse } from '@/types';

const GENRES = [
  { label: 'Action', value: 'Action' },
  { label: 'Comedy', value: 'Comedy' },
  { label: 'Drama', value: 'Drama' },
  { label: 'Horror', value: 'Horror' },
  { label: 'Sci-Fi', value: 'Sci-Fi' },
  { label: 'Romance', value: 'Romance' },
  { label: 'Animation', value: 'Animation' },
  { label: 'Fantasy', value: 'Fantasy' },
  { label: 'Thriller', value: 'Thriller' },
  { label: 'Documentary', value: 'Documentary' },
];

const TYPES = [
  { label: 'Movies', value: 'MOVIE' },
  { label: 'TV Shows', value: 'SERIES' },
  { label: 'Anime', value: 'ANIME' },
];

const YEARS = Array.from({ length: 20 }, (_, i) => ({
  label: String(2026 - i),
  value: String(2026 - i),
}));

const RATINGS = [
  { label: '8+ Stars', value: '8' },
  { label: '7+ Stars', value: '7' },
  { label: '6+ Stars', value: '6' },
  { label: '5+ Stars', value: '5' },
];

const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'Hindi', value: 'hi' },
];

export default function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);

  const [filters, setFilters] = useState<Record<string, string>>({
    genre: searchParams.get('genre') || '',
    type: searchParams.get('type') || '',
    year: searchParams.get('year') || '',
    rating: searchParams.get('rating') || '',
    language: searchParams.get('language') || '',
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchResults = useCallback(
    async (q: string, f: Record<string, string>, p: number, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (f.genre) params.set('genre', f.genre);
        if (f.type) params.set('type', f.type);
        if (f.year) params.set('year', f.year);
        if (f.rating) params.set('rating', f.rating);
        if (f.language) params.set('language', f.language);
        params.set('page', String(p));
        params.set('limit', '24');

        const res = await fetch(`/api/search?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const d: PaginatedResponse<ContentItem> = data.data;
            setResults((prev) => (append ? [...prev, ...d.items] : d.items));
            setTotal(d.total);
            setPages(d.pages);
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (initialQuery) {
      fetchResults(initialQuery, filters, 1);
    }
    inputRef.current?.focus();
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(value, filters, 1);
      const params = new URLSearchParams();
      if (value) params.set('q', value);
      router.push(`/search?${params}`, { scroll: false });
    }, 400);
  };

  const handleFilterChange = (key: string, value: string) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    setPage(1);
    fetchResults(query, updated, 1);
  };

  const handleClearFilters = () => {
    const cleared: Record<string, string> = {};
    setFilters(cleared);
    setPage(1);
    fetchResults(query, cleared, 1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchResults(query, filters, nextPage, true);
  };

  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search movies, series, anime..."
              className="h-12 w-full rounded-lg border border-border bg-surface pl-12 pr-10 text-sm text-white placeholder-muted outline-none transition-colors focus:border-accent"
            />
            {query && (
              <button
                onClick={() => handleQueryChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-6">
          <SearchFilters
            genres={GENRES}
            languages={LANGUAGES}
            years={YEARS}
            ratings={RATINGS}
            types={TYPES}
            activeFilters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {query && (
          <p className="mb-4 text-sm text-muted">
            {loading && results.length === 0
              ? 'Searching...'
              : `${total} result${total !== 1 ? 's' : ''} for "${query}"`}
          </p>
        )}

        {loading && results.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[2/3] rounded-lg skeleton" />
                <div className="mt-2 space-y-1.5">
                  <div className="h-4 w-3/4 rounded skeleton" />
                  <div className="h-3 w-1/2 rounded skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>

            {page < pages && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="rounded-md border border-border bg-surface px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-surface-hover disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        ) : query ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface">
              <Search className="h-8 w-8 text-muted" />
            </div>
            <p className="text-lg font-medium text-white">No results found</p>
            <p className="mt-2 max-w-sm text-sm text-muted">
              No results for &ldquo;{query}&rdquo;. Try different keywords or adjust filters.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface">
              <Search className="h-8 w-8 text-muted" />
            </div>
            <p className="text-lg font-medium text-white">Search StreamX</p>
            <p className="mt-2 text-sm text-muted">Find your favorite movies, TV shows, and anime</p>
          </div>
        )}
      </div>
    </div>
  );
}
