export function SkeletonCard() {
  return (
    <div className="flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]">
      <div className="aspect-[2/3] rounded-lg skeleton" />
      <div className="mt-2 space-y-1.5 px-0.5">
        <div className="h-4 w-3/4 rounded skeleton" />
        <div className="h-3 w-1/2 rounded skeleton" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <section className="px-4 lg:px-8">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-6 w-40 rounded skeleton" />
        <div className="h-5 w-16 rounded skeleton" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}

export function SkeletonHero() {
  return (
    <div className="relative h-[70vh] min-h-[500px] w-full skeleton">
      <div className="absolute bottom-24 left-4 space-y-4 lg:left-8">
        <div className="h-4 w-20 rounded skeleton" />
        <div className="h-12 w-96 max-w-full rounded skeleton" />
        <div className="flex gap-2">
          <div className="h-4 w-16 rounded skeleton" />
          <div className="h-4 w-16 rounded skeleton" />
          <div className="h-4 w-24 rounded skeleton" />
        </div>
        <div className="h-16 w-full max-w-lg rounded skeleton" />
        <div className="flex gap-3">
          <div className="h-12 w-32 rounded-md skeleton" />
          <div className="h-12 w-32 rounded-md skeleton" />
        </div>
      </div>
    </div>
  );
}
