export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, error } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const collections = await db.collection.findMany({
      include: {
        items: {
          include: { content: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return success(collections);
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Failed', 500);
  }
}
