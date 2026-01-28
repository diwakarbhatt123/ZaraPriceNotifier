import { NextResponse } from 'next/server';

const apiBase = process.env.ZARA_API_BASE || 'http://localhost:8080';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const res = await fetch(`${apiBase}/api/watch/${params.id}`, { method: 'DELETE' });
  const body = await res.text();
  if (res.status === 204 || body.length === 0) {
    return new NextResponse(null, { status: res.status });
  }
  return new NextResponse(body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
}
