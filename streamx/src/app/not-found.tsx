import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6">
        <span className="text-8xl font-bold tracking-tight">
          <span className="text-accent">4</span>
          <span className="text-white">0</span>
          <span className="text-accent">4</span>
        </span>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-white">Page not found</h1>
      <p className="mb-8 max-w-md text-sm text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back to watching.
      </p>

      <Link
        href="/"
        className="btn-primary inline-flex items-center gap-2 text-sm"
      >
        Back to Home
      </Link>
    </div>
  );
}
