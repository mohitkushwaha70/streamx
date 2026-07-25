import { cookies } from 'next/headers';
import { success } from '@/lib/api';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('streamx_token');
  return success({ loggedOut: true });
}
