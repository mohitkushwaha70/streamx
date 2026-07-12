import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block text-3xl font-bold tracking-tight">
            <span className="text-accent">Stream</span>
            <span className="text-white">X</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface/80 p-8 shadow-2xl backdrop-blur-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
