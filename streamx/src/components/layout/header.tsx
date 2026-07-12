'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Movies', href: '/movies' },
  { label: 'Series', href: '/series' },
  { label: 'Anime', href: '/anime' },
  { label: 'Search', href: '/search' },
];

export function Header() {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery('');
        setMobileOpen(false);
      }
    },
    [searchQuery, router],
  );

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-background/95 backdrop-blur-md border-b border-border'
          : 'bg-gradient-to-b from-black/80 to-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-accent">Stream</span>
            <span className="text-white">X</span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      'px-3 py-2 text-sm font-medium transition-colors rounded-md',
                      isActive
                        ? 'text-white'
                        : 'text-muted hover:text-white',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="hidden items-center md:flex">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search titles..."
                className="h-9 w-48 rounded-full border border-border bg-surface/80 px-4 pr-10 text-sm text-white placeholder-muted outline-none transition-all focus:border-accent focus:w-64"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          <Link
            href="/search"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:text-white md:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>

          {!loading && (
            <>
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <ChevronDown className="hidden h-4 w-4 text-muted md:block" />
                  </button>

                  {userDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setUserDropdownOpen(false)}
                      />
                      <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-surface py-1 shadow-xl">
                        <div className="border-b border-border px-4 py-3">
                          <p className="text-sm font-medium text-white">
                            {user.name}
                          </p>
                          <p className="text-xs text-muted">{user.email}</p>
                        </div>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-white transition-colors hover:bg-surface-hover"
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                        {user.role === 'ADMIN' && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-white transition-colors hover:bg-surface-hover"
                          >
                            <User className="h-4 w-4" />
                            Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={async () => {
                            await fetch('/api/auth/logout', { method: 'POST' });
                            setUserDropdownOpen(false);
                            window.location.href = '/';
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white transition-colors hover:bg-surface-hover"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  Sign In
                </Link>
              )}
            </>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border bg-background/98 backdrop-blur-lg md:hidden">
          <div className="space-y-1 px-4 py-4">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'block rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-surface text-white'
                      : 'text-muted hover:bg-surface-hover hover:text-white',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <form
            onSubmit={handleSearch}
            className="border-t border-border px-4 py-3"
          >
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search titles..."
                className="h-10 w-full rounded-lg border border-border bg-surface px-4 pr-10 text-sm text-white placeholder-muted outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {!loading && !user && (
            <div className="border-t border-border px-4 py-4">
              <Link
                href="/auth/login"
                className="flex w-full items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
