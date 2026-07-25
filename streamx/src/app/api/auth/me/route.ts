export const dynamic = 'force-dynamic';
import { getUser } from '@/lib/auth';
import { success, unauthorized } from '@/lib/api';
import { db } from '@/lib/db';

export async function GET() {
  const payload = await getUser();
  if (!payload) return unauthorized();

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, role: true, plan: true, avatar: true, createdAt: true },
  });
  if (!user) return unauthorized();

  return success(user);
}
