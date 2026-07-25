export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error('NEXT_PUBLIC_APP_URL is not set');
  return url;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return new Response('Google OAuth not configured', { status: 500 });

  let baseUrl: string;
  try {
    baseUrl = getBaseUrl();
  } catch {
    return new Response('NEXT_PUBLIC_APP_URL is not configured on the server', { status: 500 });
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
