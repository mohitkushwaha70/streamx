export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/api';
import { syncContent } from '@/services/hf-sync';

export async function POST() {
  const user = await getUser();
  if (!user || user.role !== 'ADMIN') return unauthorized('Admin only');

  try {
    const result = await syncContent();
    return success(result);
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Sync failed', 500);
  }
}
