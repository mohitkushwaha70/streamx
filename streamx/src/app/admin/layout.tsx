'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import {
  Home,
  Film,
  Tv,
  BookOpen,
  Users,
  BarChart3,
  Activity,
  Database,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  FileText,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: Home },
  {
    label: 'Content',
    icon: Film,
    children: [
      { label: 'All Content', href: '/admin/content', icon: Film },
      { label: 'Movies', href: '/admin/content?type=MOVIE', icon: Film },
      { label: 'Series', href: '/admin/content?type=SERIES', icon: Tv },
      { label: 'Anime', href: '/admin/content?type=ANIME', icon: BookOpen },
    ],
  },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Collections', href: '/admin/collections', icon: Layers },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Logs', href: '/admin/logs', icon: FileText },
  { label: 'Sync', href: '/admin/sync', icon: Database },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Content']);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    const base = href.split('?')[0];
    return pathname === base || pathname.startsWith(base + '/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#e50914]">StreamX</span>
            <span className="text-xs font-medium text-muted bg-border px-1.5 py-0.5 rounded">Admin</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleSection(item.label)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      'text-muted hover:text-white hover:bg-surface-hover'
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronIcon expanded={expandedSections.includes(item.label)} />
                  </button>
                  {expandedSections.includes(item.label) && (
                    <div className="ml-5 mt-1 space-y-0.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive(child.href)
                              ? 'bg-[#e50914]/10 text-[#e50914] font-medium'
                              : 'text-muted hover:text-white hover:bg-surface-hover'
                          )}
                        >
                          <child.icon className="w-4 h-4 shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-[#e50914]/10 text-[#e50914]'
                      : 'text-muted hover:text-white hover:bg-surface-hover'
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-white hover:bg-surface-hover transition-colors"
          >
            <Activity className="w-5 h-5" />
            <span>View Site</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-surface/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-muted hover:text-white rounded-lg hover:bg-surface-hover transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#e50914] flex items-center justify-center text-white text-sm font-bold">
              {user.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout');
                router.replace('/login');
              }}
              className="p-2 text-muted hover:text-[#e50914] rounded-lg hover:bg-surface-hover transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={cn('w-4 h-4 transition-transform duration-200', expanded && 'rotate-90')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
