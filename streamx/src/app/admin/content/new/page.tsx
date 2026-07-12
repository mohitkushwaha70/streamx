'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Film, Tv, BookOpen } from 'lucide-react';
import { cn, generateVideoSlug } from '@/lib/utils';

const CONTENT_TYPES = ['MOVIE', 'SERIES', 'ANIME'] as const;
const GENRE_OPTIONS = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance',
  'Thriller', 'Animation', 'Documentary', 'Fantasy', 'Mystery',
  'Adventure', 'Crime', 'Family', 'Music', 'War', 'Western',
  'Biography', 'History', 'Sport',
];

const COUNTRIES = [
  'United States', 'United Kingdom', 'Japan', 'South Korea', 'France',
  'Germany', 'India', 'Canada', 'Australia', 'Spain', 'Italy', 'Brazil',
  'Mexico', 'China', 'Russia', 'Nigeria', 'Sweden', 'Norway',
];

const LANGUAGES = [
  'English', 'Japanese', 'Korean', 'Spanish', 'French', 'German',
  'Hindi', 'Portuguese', 'Mandarin', 'Italian', 'Russian', 'Arabic',
  'Swedish', 'Norwegian', 'Thai',
];

export default function NewContentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    type: 'MOVIE',
    description: '',
    poster: '',
    banner: '',
    trailerUrl: '',
    videoUrl: '',
    genre: [] as string[],
    language: 'English',
    country: 'United States',
    runtime: 0,
    rating: 0,
    releaseDate: '',
    cast: '',
    director: '',
    seasons: 1,
    episodesCount: 1,
    featured: false,
    trending: false,
    published: false,
  });

  const slug = useMemo(() => generateVideoSlug(form.title || ''), [form.title]);

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGenre = (g: string) => {
    setForm((prev) => ({
      ...prev,
      genre: prev.genre.includes(g) ? prev.genre.filter((x) => x !== g) : [...prev.genre, g],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...form,
        genre: form.genre.join(', '),
        genres: form.genre,
        cast: form.cast.split(',').map((s) => s.trim()).filter(Boolean),
        runtime: Number(form.runtime),
        rating: Number(form.rating),
        seasons: Number(form.seasons),
        episodesCount: Number(form.episodesCount),
        slug,
      };

      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create content');

      router.push('/admin/content');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-muted hover:text-white rounded-lg hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Add New Content</h1>
          <p className="text-muted text-sm mt-1">Create a new movie, series, or anime entry</p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Basic Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-white mb-1.5">Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
                placeholder="Enter title"
              />
              {slug && <p className="text-xs text-muted mt-1">Slug: {slug}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={(e) => updateField('type', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors appearance-none"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Language</label>
              <select
                value={form.language}
                onChange={(e) => updateField('language', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors appearance-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Country</label>
              <select
                value={form.country}
                onChange={(e) => updateField('country', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors appearance-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Runtime (minutes)</label>
              <input
                type="number"
                min="0"
                value={form.runtime}
                onChange={(e) => updateField('runtime', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Rating (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={form.rating}
                onChange={(e) => updateField('rating', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
                placeholder="0.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Release Date</label>
              <input
                type="date"
                value={form.releaseDate}
                onChange={(e) => updateField('releaseDate', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-white mb-1.5">Description</label>
              <textarea
                rows={4}
                required
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors resize-none"
                placeholder="Enter description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Director</label>
              <input
                type="text"
                value={form.director}
                onChange={(e) => updateField('director', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
                placeholder="Director name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Cast (comma-separated)</label>
              <input
                type="text"
                value={form.cast}
                onChange={(e) => updateField('cast', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
                placeholder="Actor 1, Actor 2, ..."
              />
            </div>
          </div>
        </div>

        {/* Genres */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Genres</h2>
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                  form.genre.includes(g)
                    ? 'bg-[#e50914] border-[#e50914] text-white'
                    : 'bg-transparent border-border text-muted hover:text-white hover:border-white/30'
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Media */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Media</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { key: 'poster', label: 'Poster URL', placeholder: 'https://...' },
              { key: 'banner', label: 'Banner URL', placeholder: 'https://...' },
              { key: 'trailerUrl', label: 'Trailer URL', placeholder: 'https://...' },
              { key: 'videoUrl', label: 'Video URL', placeholder: 'https://...' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-white mb-1.5">{field.label}</label>
                <input
                  type="url"
                  value={String((form as unknown as Record<string, string>)[field.key] || '')}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Series fields */}
        {form.type !== 'MOVIE' && (
          <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Series Configuration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Seasons</label>
                <input
                  type="number"
                  min="1"
                  value={form.seasons}
                  onChange={(e) => updateField('seasons', e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Episodes</label>
                <input
                  type="number"
                  min="1"
                  value={form.episodesCount}
                  onChange={(e) => updateField('episodesCount', e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Flags */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Visibility</h2>
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'featured', label: 'Featured' },
              { key: 'trending', label: 'Trending' },
              { key: 'published', label: 'Published' },
            ].map((flag) => (
              <label key={flag.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean((form as unknown as Record<string, boolean>)[flag.key])}
                  onChange={(e) => updateField(flag.key, e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-background text-[#e50914] focus:ring-[#e50914] focus:ring-offset-0"
                />
                <span className="text-sm text-white">{flag.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm font-medium text-white bg-surface-hover rounded-lg hover:bg-border transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#e50914] rounded-lg hover:bg-[#b20710] disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Content'}
          </button>
        </div>
      </form>
    </div>
  );
}
