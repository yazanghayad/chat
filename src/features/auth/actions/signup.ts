'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ID } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite/server';
import {
  APPWRITE_SESSION_COOKIE,
  APPWRITE_DATABASE
} from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import {
  validateSubdomain,
  normalizeSubdomain,
  isSubdomainAvailable
} from '@/lib/tenant/subdomain';
import type { AuthResult } from './login';

export async function signupAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const name = formData.get('name')?.toString().trim();
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();
  const rawSubdomain = formData.get('subdomain')?.toString().trim();

  if (!email || !password || !name) {
    return { error: 'Name, email, and password are required.' };
  }

  // ── Validate subdomain ──
  const subdomain = rawSubdomain ? normalizeSubdomain(rawSubdomain) : '';
  if (!subdomain) {
    return { error: 'A subdomain is required for your workspace.' };
  }
  const subdomainError = validateSubdomain(subdomain);
  if (subdomainError) {
    return { error: subdomainError };
  }
  const available = await isSubdomainAvailable(subdomain);
  if (!available) {
    return { error: 'This subdomain is already taken. Please choose another.' };
  }

  try {
    const { users, account, databases } = createAdminClient();

    // Create user
    const newUser = await users.create({
      userId: ID.unique(),
      email,
      password,
      name
    });

    // Create session
    const session = await account.createEmailPasswordSession(email, password);

    (await cookies()).set(APPWRITE_SESSION_COOKIE, session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(session.expire)
    });

    // Auto-create tenant with subdomain
    await databases.createDocument(
      APPWRITE_DATABASE,
      COLLECTION.TENANTS,
      ID.unique(),
      {
        name: name,
        plan: 'trial',
        config: JSON.stringify({ subdomain, timezone: 'UTC', language: 'en' }),
        apiKey: crypto.randomUUID().replace(/-/g, ''),
        userId: newUser.$id,
        subdomain
      }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Sign-up failed. Please try again.';
    return { error: message };
  }

  redirect('/dashboard/overview');
}
