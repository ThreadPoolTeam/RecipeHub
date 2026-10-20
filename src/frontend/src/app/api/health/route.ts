import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    service: 'recipehub-web',
    status: 'Healthy',
    timestampUtc: new Date().toISOString()
  });
}
