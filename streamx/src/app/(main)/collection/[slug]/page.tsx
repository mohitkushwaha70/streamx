export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ContentCard } from '@/components/ui/content-card';
import type { ContentItem } from '@/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getCollection(slug: string) {
  try {
    const collection = await db.collection.findFirst({
      where: { slug },
      include: {
        items: {
          include: { content: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    return collection;
  } catch {
    return null;
  }
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const collection = await getCollection(slug);

  if (!collection) {
    notFound();
  }

  const items = collection.items
    .map((item) => item.content)
    .filter(Boolean) as unknown as ContentItem[];

  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-accent">
            Collection
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-2 max-w-2xl text-sm text-muted md:text-base">
              {collection.description}
            </p>
          )}
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-medium text-white">This collection is empty</p>
            <p className="mt-2 text-sm text-muted">
              No content has been added to this collection yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
