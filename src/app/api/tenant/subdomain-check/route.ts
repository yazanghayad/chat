import { NextRequest, NextResponse } from 'next/server';
import {
  validateSubdomain,
  normalizeSubdomain,
  isSubdomainAvailable
} from '@/lib/tenant/subdomain';

/**
 * GET /api/tenant/subdomain-check?slug=my-company
 *
 * Publicly accessible endpoint to check subdomain availability
 * before or during signup.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { error: 'Missing "slug" query parameter' },
      { status: 400 }
    );
  }

  const normalized = normalizeSubdomain(slug);
  const validationError = validateSubdomain(normalized);

  if (validationError) {
    return NextResponse.json({
      available: false,
      error: validationError
    });
  }

  const available = await isSubdomainAvailable(normalized);

  return NextResponse.json({
    available,
    subdomain: normalized,
    error: available ? null : 'This subdomain is already taken.'
  });
}
