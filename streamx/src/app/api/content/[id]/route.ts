export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, error, notFound, unauthorized } from '@/lib/api';
import { getUser } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const content = await db.content.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { episodes: { orderBy: [{ season: 'asc' }, { number: 'asc' }] } },
    });
    if (!content) return notFound('Content not found');

    await db.content.update({
      where: { id: content.id },
      data: { viewCount: { increment: 1 } },
    });

    return success(content);
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Failed', 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'ADMIN') return unauthorized('Admin only');

    const { id } = await params;
    const body = await req.json();
    const existing = await db.content.findUnique({ where: { id } });
    if (!existing) return notFound();

    const content = await db.content.update({ where: { id }, data: body });
    return success(content);
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Failed to update', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'ADMIN') return unauthorized('Admin only');

    const { id } = await params;
    await db.content.delete({ where: { id } });
    return success({ deleted: true });
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Failed to delete', 500);
  }
}
