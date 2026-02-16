import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

/**
 * GET /api/widget/chat-widget.js
 *
 * Serves the compiled widget JS with appropriate CORS headers so it can
 * be embedded on any domain via a <script> tag.
 */
export async function GET(request: NextRequest) {
  try {
    const filePath = resolve(process.cwd(), 'public/widget/chat-widget.js');
    const js = await readFile(filePath, 'utf-8');

    const origin = request.headers.get('origin') ?? '*';

    return new NextResponse(js, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    return NextResponse.json(
      { error: 'Widget not built. Run: npm run build:widget' },
      { status: 404 }
    );
  }
}
