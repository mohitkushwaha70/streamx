import Link from 'next/link';

const FOOTER_LINKS = [
  {
    title: 'Browse',
    links: [
      { label: 'Movies', href: '/movies' },
      { label: 'TV Shows', href: '/series' },
      { label: 'Anime', href: '/anime' },
      { label: 'Search', href: '/search' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Profile', href: '/profile' },
      { label: 'Sign In', href: '/login' },
      { label: 'Register', href: '/register' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50 mt-auto">
      <div className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-bold tracking-tight">
              <span className="text-accent">Stream</span>
              <span className="text-white">X</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Your premium destination for movies, TV shows, and anime. Watch anytime, anywhere.
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-muted">Privacy Policy</span>
              </li>
              <li>
                <span className="text-sm text-muted">Terms of Service</span>
              </li>
              <li>
                <span className="text-sm text-muted">Cookie Preferences</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-center text-xs text-muted">
            &copy; {new Date().getFullYear()} StreamX. All rights reserved. Content is for demonstration purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
