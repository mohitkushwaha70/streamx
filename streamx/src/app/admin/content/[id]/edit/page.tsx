'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Edit, Film, Tv, BookOpen } from 'lucide-react';
import { cn, generateVideoSlug } from '@/lib/utils';
import type { ContentItem, Episode } from '@/types';

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

interface EpisodeForm {
  id?: string;
  season: number;
  number: number;
  title: string;
  description: string;
  videoUrl: string;
  duration: number;
}

export default function EditContentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeForm[]>([]);
  const [editingEpisode, setEditingEpisode] = useState<EpisodeForm | null>(null);
  const [showEpisodeForm, setShowEpisodeForm] = useState(false);

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

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(`/api/content/${id}`);
        if (!res.ok) throw new Error('Content not found');
        const json = await res.json();
        if (json.success) {
          const data: ContentItem = json.data;
          setForm({
            title: data.title,
            type: data.type,
            description: data.description,
            poster: data.poster || '',
            banner: data.banner || '',
            trailerUrl: data.trailerUrl || '',
            videoUrl: data.videoUrl || '',
            genre: data.genres || (data.genre ? data.genre.split(', ') : []),
            language: data.language || 'English',
            country: data.country || 'United States',
            runtime: data.runtime || 0,
            rating: data.rating || 0,
            releaseDate: data.releaseDate || '',
            cast: (data.cast || []).join(', '),
            director: data.director || '',
            seasons: data.seasons || 1,
            episodesCount: data.episodesCount || 1,
            featured: data.featured,
            trending: data.trending,
            published: data.published,
          });
          if (data.episodes) {
            setEpisodes(
              data.episodes.map((e: Episode) => ({
                id: e.id,
                season: e.season,
                number: e.number,
                title: e.title,
                description: e.description || '',
                videoUrl: e.videoUrl || '',
                duration: e.duration || 0,
              }))
            );
          }
        }
      } catch {
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [id]);

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

      const res = await fetch(`/api/content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update content');

      router.push('/admin/content');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const saveEpisode = async (ep: EpisodeForm) => {
    try {
      const isEdit = !!ep.id;
      const url = isEdit ? `/api/content/${id}/episodes/${ep.id}` : `/api/content/${id}/episodes`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: Number(ep.season),
          number: Number(ep.number),
          title: ep.title,
          description: ep.description,
          videoUrl: ep.videoUrl,
          duration: Number(ep.duration),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (isEdit) {
          setEpisodes((prev) =>
            prev.map((e) => (e.id === ep.id ? { ...ep, ...json.data } : e))
          );
        } else {
          setEpisodes((prev) => [...prev, { ...ep, id: json.data.id }]);
        }
        setShowEpisodeForm(false);
        setEditingEpisode(null);
      }
    } catch {
      // silent
    }
  };

  const deleteEpisode = async (ep: EpisodeForm) => {
    if (!ep.id) return;
    try {
      const res = await fetch(`/api/content/${id}/episodes/${ep.id}`, { method: 'DELETE' });
      if (res.ok) {
        setEpisodes((prev) => prev.filter((e) => e.id !== ep.id));
      }
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 skeleton rounded-lg" />
          <div>
            <div className="w-48 h-6 skeleton" />
            <div className="w-32 h-4 skeleton mt-2" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div className="w-40 h-5 skeleton" />
            <div className="w-full h-10 skeleton" />
          </div>
        ))}
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-white">Edit Content</h1>
          <p className="text-muted text-sm mt-1">Update content details</p>
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
              />
              <p className="text-xs text-muted mt-1">Slug: {slug}</p>
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
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors"
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
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors"
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Director</label>
              <input
                type="text"
                value={form.director}
                onChange={(e) => updateField('director', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Cast (comma-separated)</label>
              <input
                type="text"
                value={form.cast}
                onChange={(e) => updateField('cast', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
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
              { key: 'poster', label: 'Poster URL' },
              { key: 'banner', label: 'Banner URL' },
              { key: 'trailerUrl', label: 'Trailer URL' },
              { key: 'videoUrl', label: 'Video URL' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-white mb-1.5">{field.label}</label>
                <input
                  type="url"
                  value={String((form as unknown as Record<string, string>)[field.key] || '')}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
                  placeholder="https://..."
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

        {/* Episodes management */}
        {form.type !== 'MOVIE' && (
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Episodes</h2>
              <button
                type="button"
                onClick={() => {
                  setEditingEpisode({
                    season: 1,
                    number: episodes.length + 1,
                    title: '',
                    description: '',
                    videoUrl: '',
                    duration: 0,
                  });
                  setShowEpisodeForm(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e50914] hover:bg-[#b20710] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Episode
              </button>
            </div>

            {showEpisodeForm && editingEpisode && (
              <EpisodeFormPanel
                episode={editingEpisode}
                onSave={saveEpisode}
                onCancel={() => {
                  setShowEpisodeForm(false);
                  setEditingEpisode(null);
                }}
              />
            )}

            {episodes.length === 0 ? (
              <p className="text-muted text-sm py-8 text-center">No episodes yet. Add one above.</p>
            ) : (
              <div className="space-y-2">
                {episodes
                  .sort((a, b) => a.season - b.season || a.number - b.number)
                  .map((ep) => (
                    <div
                      key={ep.id || `new-${ep.season}-${ep.number}`}
                      className="flex items-center justify-between px-4 py-3 bg-background rounded-lg border border-border"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          S{ep.season} E{ep.number} — {ep.title || 'Untitled'}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {ep.duration ? `${ep.duration}m` : 'No duration'}
                          {ep.videoUrl ? ' · Has video' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEpisode(ep);
                            setShowEpisodeForm(true);
                          }}
                          className="p-2 text-muted hover:text-blue-400 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEpisode(ep)}
                          className="p-2 text-muted hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

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
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function EpisodeFormPanel({
  episode,
  onSave,
  onCancel,
}: {
  episode: EpisodeForm;
  onSave: (ep: EpisodeForm) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(episode);

  return (
    <div className="p-4 bg-background rounded-lg border border-[#e50914]/30 space-y-4">
      <h3 className="text-sm font-semibold text-white">
        {episode.id ? 'Edit Episode' : 'New Episode'}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">Season</label>
          <input
            type="number"
            min="1"
            value={form.season}
            onChange={(e) => setForm((p) => ({ ...p, season: Number(e.target.value) }))}
            className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Number</label>
          <input
            type="number"
            min="1"
            value={form.number}
            onChange={(e) => setForm((p) => ({ ...p, number: Number(e.target.value) }))}
            className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Duration (min)</label>
          <input
            type="number"
            min="0"
            value={form.duration}
            onChange={(e) => setForm((p) => ({ ...p, duration: Number(e.target.value) }))}
            className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-muted mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm text-white focus:outline-none focus:border-[#e50914] transition-colors"
            placeholder="Episode title"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Description</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors resize-none"
          placeholder="Episode description"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Video URL</label>
        <input
          type="url"
          value={form.videoUrl}
          onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
          className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#e50914] transition-colors"
          placeholder="https://..."
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-muted hover:text-white bg-surface-hover rounded-md transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-[#e50914] rounded-md hover:bg-[#b20710] transition-colors"
        >
          {episode.id ? 'Update' : 'Add'} Episode
        </button>
      </div>
    </div>
  );
}
