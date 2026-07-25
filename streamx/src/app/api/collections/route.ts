import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, error } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    const collections = await db.collection.findMany({
      orderBy: { createdAt: 'desc' },
    });

    let result = collections;
    if (slug) {
      result = collections.filter((c) => c.slug === slug);
    }

    const collectionsWithItems = await Promise.all(
      result.map(async (col) => {
        const items = await db.collectionItem.findMany({
          where: { collectionId: col.id },
          orderBy: { order: 'asc' },
        });

        const contentIds = items.map((i) => i.contentId);
        const contentItems = contentIds.length > 0
          ? await db.content.findMany({ where: { id: { in: contentIds } } })
          : [];

        const contentMap = new Map(contentItems.map((c) => [c.id, c]));

        return {
          ...col,
          items: items
            .map((i) => ({
              ...i,
              content: contentMap.get(i.contentId),
            }))
            .filter((i) => i.content),
        };
      })
    );

    return success(collectionsWithItems);
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Failed', 500);
  }
}
