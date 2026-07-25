export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error('NEXT_PUBLIC_APP_URL is not set');
  return url;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const errParam = req.nextUrl.searchParams.get('error');

  let baseUrl: string;
  try {
    baseUrl = getBaseUrl();
  } catch {
    return Response.redirect('/login?error=google_not_configured');
  }

  if (errParam || !code) {
    return Response.redirect(`${baseUrl}/login?error=google_auth_failed`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return Response.redirect(`${baseUrl}/login?error=google_not_configured`);
    }

    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return Response.redirect(`${baseUrl}/login?error=token_exchange_failed`);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userRes.json();
    if (!googleUser.email) {
      return Response.redirect(`${baseUrl}/login?error=user_info_failed`);
    }

    let user = await db.user.findUnique({ where: { email: googleUser.email } });

    if (!user) {
      user = await db.user.create({
        data: {
          name: googleUser.name || googleUser.email.split('@')[0],
          email: googleUser.email,
          avatar: googleUser.picture || null,
          password: null,
        },
      });
    } else if (!user.avatar && googleUser.picture) {
      user = await db.user.update({
        where: { id: user.id },
        data: { avatar: googleUser.picture },
      });
    }

    if (user.banned) {
      return Response.redirect(`${baseUrl}/login?error=account_suspended`);
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    await db.activityLog.create({
      data: {
        type: 'auth',
        message: `${user.name} (${user.email}) logged in via Google`,
        userId: user.id,
        metadata: JSON.stringify({ action: 'google_login' }),
      },
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    const cookieStore = await cookies();
    cookieStore.set('streamx_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return Response.redirect(`${baseUrl}/`);
  } catch (e) {
    console.error('Google OAuth callback error:', e);
    return Response.redirect(`${baseUrl}/login?error=google_auth_failed`);
  }
}
