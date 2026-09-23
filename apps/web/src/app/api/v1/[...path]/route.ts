import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOP_BY_HOP = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function apiOrigin(): string {
  const configured = process.env.API_ORIGIN?.trim().replace(/\/$/, '');
  if (configured) {
    return configured;
  }
  if (process.env.VERCEL === '1') {
    return '';
  }
  return 'http://localhost:3001';
}

function unavailable(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const origin = apiOrigin();
  if (!origin) {
    return unavailable(
      503,
      'API_UNAVAILABLE',
      'The ForestWatch API is not configured. Deploy apps/api as a second Vercel project and set API_ORIGIN to that URL (no /api/v1 suffix).',
    );
  }

  const { path } = await context.params;
  const target = new URL(`/api/v1/${path.join('/')}`, `${origin}/`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const out = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        out.append(key, value);
      }
    });
    return new NextResponse(upstream.body, { status: upstream.status, headers: out });
  } catch {
    return unavailable(
      502,
      'API_UNREACHABLE',
      `Could not reach the ForestWatch API at ${origin}. Start it with pnpm --filter @forestwatch/api dev, or set API_ORIGIN.`,
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
