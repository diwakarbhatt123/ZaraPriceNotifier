import { NextResponse } from 'next/server';

const apiBase = process.env.ZARA_API_BASE || 'http://localhost:8080';

export async function GET() {
  const res = await fetch(`${apiBase}/api/watch`, { cache: 'no-store' });
  const body = await res.text();
  return new NextResponse(body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
}

export async function POST(request: Request) {
  const payload = await request.text();
  const res = await fetch(`${apiBase}/api/watch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  });
  const body = await res.text();
  return new NextResponse(body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
}
