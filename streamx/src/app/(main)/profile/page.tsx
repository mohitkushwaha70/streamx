'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Bookmark, Clock, History, Settings, LogOut } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { ContentCard } from '@/components/ui/content-card';
import type { User as UserType, ContentItem } from '@/types';

type Tab = 'history' | 'bookmarks' | 'watchlater';

interface HistoryItem extends ContentItem {
  progress?: number;
  completed?: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<ContentItem[]>([]);
  const [watchLater, setWatchLater] = useState<ContentItem[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const fetchTabData = useCallback(async (tab: Tab) => {
    setTabLoading(true);
    try {
      if (tab === 'history') {
        const res = await fetch('/api/user/history');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setHistory(data.data);
        }
      } else if (tab === 'bookmarks') {
        const res = await fetch('/api/user/bookmarks');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setBookmarks(data.data);
        }
      } else if (tab === 'watchlater') {
        const res = await fetch('/api/user/watchlater');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setWatchLater(data.data);
        }
      }
    } catch {
      // silent
    } finally {
      setTabLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchTabData(activeTab);
  }, [activeTab, user, fetchTabData]);

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const tabs: { key: Tab; label: string; icon: typeof History }[] = [
    { key: 'history', label: 'Watch History', icon: History },
    { key: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { key: 'watchlater', label: 'Watch Later', icon: Clock },
  ];

  const currentItems =
    activeTab === 'history'
      ? history
      : activeTab === 'bookmarks'
      ? bookmarks
      : watchLater;

  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
        <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              getInitials(user.name)
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <p className="mt-0.5 text-sm text-muted">{user.email}</p>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={cn(
                  'rounded-full px-3 py-0.5 text-xs font-medium',
                  user.plan === 'PREMIUM'
                    ? 'bg-accent/20 text-accent'
                    : 'bg-surface-hover text-muted'
                )}
              >
                {user.plan} Plan
              </span>
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="rounded-full bg-surface-hover px-3 py-0.5 text-xs font-medium text-muted transition-colors hover:text-white"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <div className="mb-6 flex gap-1 border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'border-accent text-white'
                    : 'border-transparent text-muted hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {tabLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[2/3] rounded-lg skeleton" />
                <div className="mt-2 space-y-1.5">
                  <div className="h-4 w-3/4 rounded skeleton" />
                  <div className="h-3 w-1/2 rounded skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : currentItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {currentItems.map((item) => (
              <div key={item.id}>
                <ContentCard item={item} />
                {'progress' in item && typeof item.progress === 'number' && item.progress > 0 && (
                  <div className="mt-1 px-0.5">
                    <div className="h-1 w-full rounded-full bg-surface-hover overflow-hidden">
                      <div
                        className="progress-bar h-full"
                        style={{ width: `${Math.min(item.progress, 100)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {Math.round(item.progress)}% watched
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface">
              {activeTab === 'history' && <History className="h-8 w-8 text-muted" />}
              {activeTab === 'bookmarks' && <Bookmark className="h-8 w-8 text-muted" />}
              {activeTab === 'watchlater' && <Clock className="h-8 w-8 text-muted" />}
            </div>
            <p className="text-lg font-medium text-white">
              {activeTab === 'history' && 'No watch history yet'}
              {activeTab === 'bookmarks' && 'No bookmarks yet'}
              {activeTab === 'watchlater' && 'No watch later items yet'}
            </p>
            <p className="mt-2 text-sm text-muted">
              {activeTab === 'history' && 'Start watching content to build your history'}
              {activeTab === 'bookmarks' && 'Save titles you want to watch later'}
              {activeTab === 'watchlater' && 'Add titles to your watch later list'}
            </p>
            <Link href="/" className="btn-primary mt-4 text-sm">
              Browse Content
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
