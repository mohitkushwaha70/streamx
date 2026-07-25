import { Suspense } from 'react';
import SearchContent from './search-content';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-20">
          <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
            <div className="mb-6">
              <div className="h-12 w-full max-w-2xl rounded-lg skeleton" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[2/3] rounded-lg skeleton" />
                  <div className="mt-2 space-y-1.5">
                    <div className="h-4 w-3/4 rounded skeleton" />
                    <div className="h-3 w-1/2 rounded skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
