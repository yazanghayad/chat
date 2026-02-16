'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/appwrite/server';
import { APPWRITE_SESSION_COOKIE } from '@/lib/appwrite/constants';

export async function logoutAction() {
  const { account } = await createSessionClient();

  await account.deleteSession('current');
  (await cookies()).delete(APPWRITE_SESSION_COOKIE);

  redirect('/auth/sign-in');
}
