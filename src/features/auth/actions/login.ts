'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_SESSION_COOKIE } from '@/lib/appwrite/constants';

export interface AuthResult {
  error?: string;
}

export async function loginAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const { account } = createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    (await cookies()).set(APPWRITE_SESSION_COOKIE, session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(session.expire)
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Login failed. Check your credentials.';
    return { error: message };
  }

  redirect('/dashboard/overview');
}
