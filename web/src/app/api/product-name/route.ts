import { NextResponse } from 'next/server';

const apiBase = process.env.ZARA_API_BASE || 'http://localhost:8080';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  const countryPath = searchParams.get('countryPath');

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 });
  }

  const url = new URL(`${apiBase}/api/product/name`);
  url.searchParams.set('productId', productId);
  if (countryPath) {
    url.searchParams.set('countryPath', countryPath);
  }

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const body = await res.text();
  return new NextResponse(body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
}
