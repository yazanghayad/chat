'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_SESSION_COOKIE } from '@/lib/appwrite/constants';

export async function loginAction(formData: FormData) {
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const { account } = createAdminClient();
  const session = await account.createEmailPasswordSession(email, password);

  (await cookies()).set(APPWRITE_SESSION_COOKIE, session.secret, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(session.expire)
  });

  redirect('/dashboard/overview');
}
