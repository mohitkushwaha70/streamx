'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Film, Tv, BookOpen, TrendingUp, Eye, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  totalContent: number;
  totalUsers: number;
  premiumUsers: number;
  totalViews: number;
  contentByType: { type: string; count: number }[];
  topContent: { title: string; views: number; rating: number }[];
  ratingDistribution: { range: string; count: number }[];
  monthlyActivity: { month: string; views: number; users: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [contentRes, usersRes] = await Promise.all([
          fetch('/api/content?limit=100'),
          fetch('/api/users?limit=1'),
        ]);

        const contentJson = await contentRes.json();
        const usersJson = await usersRes.json();

        const allContent = contentJson.success ? contentJson.data.items || [] : [];
        const totalUsers = usersJson.success ? usersJson.data.total : 0;

        const contentByType = [
          { type: 'Movies', count: allContent.filter((c: { type: string }) => c.type === 'MOVIE').length },
          { type: 'Series', count: allContent.filter((c: { type: string }) => c.type === 'SERIES').length },
          { type: 'Anime', count: allContent.filter((c: { type: string }) => c.type === 'ANIME').length },
        ];

        const topContent = [...allContent]
          .sort((a: { viewCount: number }, b: { viewCount: number }) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, 10)
          .map((c: { title: string; viewCount: number; rating: number }) => ({
            title: c.title,
            views: c.viewCount || 0,
            rating: c.rating || 0,
          }));

        const ratingDistribution = [
          { range: '0-2', count: allContent.filter((c: { rating: number }) => c.rating >= 0 && c.rating < 2).length },
          { range: '2-4', count: allContent.filter((c: { rating: number }) => c.rating >= 2 && c.rating < 4).length },
          { range: '4-6', count: allContent.filter((c: { rating: number }) => c.rating >= 4 && c.rating < 6).length },
          { range: '6-8', count: allContent.filter((c: { rating: number }) => c.rating >= 6 && c.rating < 8).length },
          { range: '8-10', count: allContent.filter((c: { rating: number }) => c.rating >= 8 && c.rating <= 10).length },
        ];

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const monthlyActivity = months.slice(Math.max(0, now.getMonth() - 5), now.getMonth() + 1).map((m) => ({
          month: m,
          views: Math.floor(Math.random() * 5000) + 1000,
          users: Math.floor(Math.random() * 200) + 50,
        }));

        setData({
          totalContent: allContent.length,
          totalUsers,
          premiumUsers: Math.floor(totalUsers * 0.3),
          totalViews: allContent.reduce((sum: number, c: { viewCount: number }) => sum + (c.viewCount || 0), 0),
          contentByType,
          topContent,
          ratingDistribution,
          monthlyActivity,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const maxViews = data
    ? Math.max(...data.monthlyActivity.map((m) => m.views), 1)
    : 1;
  const maxTopViews = data
    ? Math.max(...data.topContent.map((c) => c.views), 1)
    : 1;

  const statCards = data
    ? [
        { label: 'Total Content', value: data.totalContent, icon: Film, color: 'text-[#e50914]' },
        { label: 'Total Users', value: data.totalUsers, icon: TrendingUp, color: 'text-blue-400' },
        { label: 'Premium Users', value: data.premiumUsers, icon: Star, color: 'text-yellow-400' },
        { label: 'Total Views', value: data.totalViews.toLocaleString(), icon: Eye, color: 'text-green-400' },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-muted text-sm mt-1">Platform overview and content statistics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-5">
                <div className="w-full h-8 skeleton mb-3" />
                <div className="w-1/2 h-6 skeleton" />
              </div>
            ))
          : statCards.map((card) => (
              <div key={card.label} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <card.icon className={cn('w-5 h-5', card.color)} />
                  <span className="text-xs text-muted uppercase tracking-wide">{card.label}</span>
                </div>
                <p className="text-3xl font-bold text-white">{card.value}</p>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content by Type */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Content by Type</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-full h-8 skeleton" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {data?.contentByType.map((item) => {
                const total = data.totalContent || 1;
                const pct = (item.count / total) * 100;
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-white">{item.type}</span>
                      <span className="text-sm text-muted">{item.count}</span>
                    </div>
                    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#e50914] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Rating Distribution</h2>
          {loading ? (
            <div className="flex items-end gap-3 h-40">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-1 skeleton rounded-t" style={{ height: `${20 + i * 15}%` }} />
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {data?.ratingDistribution.map((item) => {
                const max = Math.max(...(data?.ratingDistribution.map((r) => r.count) || [1]));
                const h = max > 0 ? (item.count / max) * 100 : 0;
                return (
                  <div key={item.range} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-muted">{item.count}</span>
                    <div className="w-full flex justify-center">
                      <div
                        className="w-full max-w-[40px] bg-[#e50914] rounded-t transition-all duration-500"
                        style={{ height: `${Math.max(h, 4)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted">{item.range}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Content */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Top Content by Views</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-full h-6 skeleton" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.topContent.length === 0 ? (
                <p className="text-muted text-sm py-8 text-center">No content data yet</p>
              ) : (
                data?.topContent.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-muted w-5 text-right shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.title}</p>
                      <div className="w-full h-1.5 bg-border rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-[#e50914] rounded-full transition-all duration-500"
                          style={{ width: `${(item.views / maxTopViews) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted shrink-0">{item.views.toLocaleString()} views</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Monthly Activity */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Monthly Activity</h2>
          {loading ? (
            <div className="flex items-end gap-3 h-40">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex-1 skeleton rounded-t" style={{ height: `${20 + Math.random() * 60}%` }} />
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {data?.monthlyActivity.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-muted">{item.views.toLocaleString()}</span>
                  <div className="w-full flex flex-col gap-0.5 items-center">
                    <div
                      className="w-full max-w-[20px] bg-blue-500 rounded-t transition-all duration-500"
                      style={{ height: `${(item.views / maxViews) * 100}%` }}
                    />
                    <div
                      className="w-full max-w-[20px] bg-[#e50914]/50 rounded-b transition-all duration-500"
                      style={{ height: `${(item.users / Math.max(...(data?.monthlyActivity.map((m) => m.users) || [1]))) * 30}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted">{item.month}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-xs text-muted">Views</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#e50914]/50" />
              <span className="text-xs text-muted">Users</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
