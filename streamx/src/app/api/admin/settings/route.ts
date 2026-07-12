export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/api';
import { getUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user || user.role !== 'ADMIN') return unauthorized('Admin only');

  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (key) {
    const setting = await db.setting.findUnique({ where: { key } });
    return success(setting?.value || '');
  }

  const settings = await db.setting.findMany();
  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });
  return success(map);
}

export async function PUT(req: NextRequest) {
  const user = await getUser();
  if (!user || user.role !== 'ADMIN') return unauthorized('Admin only');

  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    await db.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  return success({ saved: true });
}
