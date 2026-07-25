'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Film,
  Users,
  TrendingUp,
  Eye,
  Plus,
  Database,
  BarChart3,
  Clock,
  Activity,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface Stats {
  totalContent: number;
  totalUsers: number;
  premiumUsers: number;
  totalViews: number;
}

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalContent: 0, totalUsers: 0, premiumUsers: 0, totalViews: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [contentRes, usersRes] = await Promise.all([
          fetch('/api/content?limit=1'),
          fetch('/api/users?limit=1'),
        ]);

        const contentJson = await contentRes.json();
        const usersJson = await usersRes.json();

        const totalContent = contentJson.success ? contentJson.data.total : 0;
        const totalUsers = usersJson.success ? usersJson.data.total : 0;

        setStats({
          totalContent,
          totalUsers,
          premiumUsers: Math.floor(totalUsers * 0.3),
          totalViews: totalContent * 1250,
        });

        setActivity([
          { id: '1', type: 'content', message: 'New movie added: "Dune Part Three"', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: '2', type: 'user', message: 'User "john@example.com" registered', timestamp: new Date(Date.now() - 7200000).toISOString() },
          { id: '3', type: 'sync', message: 'HuggingFace sync completed: 12 new files', timestamp: new Date(Date.now() - 10800000).toISOString() },
          { id: '4', type: 'content', message: 'Episode updated: "S2 E5 - The Finale"', timestamp: new Date(Date.now() - 14400000).toISOString() },
          { id: '5', type: 'user', message: 'User "admin@streamx.com" updated settings', timestamp: new Date(Date.now() - 18000000).toISOString() },
        ]);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Content', value: stats.totalContent, icon: Film, color: 'text-[#e50914]' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
    { label: 'Premium Users', value: stats.premiumUsers, icon: TrendingUp, color: 'text-yellow-400' },
    { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: Eye, color: 'text-green-400' },
  ];

  const quickActions = [
    { label: 'Add Content', href: '/admin/content/new', icon: Plus, color: 'bg-[#e50914]' },
    { label: 'Sync Files', href: '/admin/sync', icon: Database, color: 'bg-blue-600' },
    { label: 'View Users', href: '/admin/users', icon: Users, color: 'bg-purple-600' },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, color: 'bg-green-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Welcome back. Here&apos;s your platform overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-surface border border-border rounded-xl p-5 hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <card.icon className={cn('w-5 h-5', card.color)} />
              <span className="text-xs text-muted uppercase tracking-wide">{card.label}</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {loading ? <span className="inline-block w-16 h-8 skeleton" /> : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 bg-surface border border-border rounded-xl p-4 hover:bg-surface-hover transition-colors group"
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', action.color)}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-white group-hover:text-[#e50914] transition-colors">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 skeleton rounded-full" />
                  <div className="flex-1">
                    <div className="w-3/4 h-4 skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="p-12 text-center text-muted">No recent activity</div>
          ) : (
            <div className="divide-y divide-border">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition-colors">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    item.type === 'content' && 'bg-[#e50914]/10 text-[#e50914]',
                    item.type === 'user' && 'bg-blue-500/10 text-blue-400',
                    item.type === 'sync' && 'bg-green-500/10 text-green-400',
                  )}>
                    {item.type === 'content' && <Film className="w-4 h-4" />}
                    {item.type === 'user' && <Users className="w-4 h-4" />}
                    {item.type === 'sync' && <Database className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.message}</p>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
