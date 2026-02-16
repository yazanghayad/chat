'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ID } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite/server';
import { APPWRITE_SESSION_COOKIE } from '@/lib/appwrite/constants';

export async function signupAction(formData: FormData) {
  const name = formData.get('name')?.toString().trim();
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();

  if (!email || !password || !name) {
    throw new Error('Name, email, and password are required.');
  }

  const { users, account } = createAdminClient();

  await users.create({
    userId: ID.unique(),
    email,
    password,
    name
  });

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
