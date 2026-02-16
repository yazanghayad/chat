import { Account, Client, Databases, Users } from 'node-appwrite';
import { cookies } from 'next/headers';
import {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT,
  APPWRITE_SESSION_COOKIE
} from './constants';

function requireEnv(value: string, name: string) {
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function createAdminClient() {
  const client = new Client()
    .setEndpoint(requireEnv(APPWRITE_ENDPOINT, 'NEXT_PUBLIC_APPWRITE_ENDPOINT'))
    .setProject(requireEnv(APPWRITE_PROJECT, 'NEXT_PUBLIC_APPWRITE_PROJECT'))
    .setKey(requireEnv(process.env.APPWRITE_API_KEY ?? '', 'APPWRITE_API_KEY'));

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    users: new Users(client)
  };
}

export async function createSessionClient() {
  const cookieStore = await cookies();
  const session = cookieStore.get(APPWRITE_SESSION_COOKIE)?.value;
  if (!session) {
    throw new Error('Missing Appwrite session');
  }

  const client = new Client()
    .setEndpoint(requireEnv(APPWRITE_ENDPOINT, 'NEXT_PUBLIC_APPWRITE_ENDPOINT'))
    .setProject(requireEnv(APPWRITE_PROJECT, 'NEXT_PUBLIC_APPWRITE_PROJECT'))
    .setSession(session);

  return {
    client,
    account: new Account(client),
    databases: new Databases(client)
  };
}
