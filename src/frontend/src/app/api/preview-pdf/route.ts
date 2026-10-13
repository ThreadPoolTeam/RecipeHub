import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'draft';

  const filename =
    type === 'official'
      ? 'phase1_smoke_official.pdf'
      : 'phase1_smoke_draft_watermark.pdf';

  const filePath = path.resolve(
    process.cwd(),
    '../../docs/plans/261014-recipehub-frontend-role-flows/reports/evidence',
    filename
  );

  if (!fs.existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  const fileBytes = fs.readFileSync(filePath);
  return new NextResponse(fileBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
