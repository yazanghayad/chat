import { Account, Client, Databases, Storage } from 'appwrite';
import {
  APPWRITE_BUCKET,
  APPWRITE_DATABASE,
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT
} from './constants';

const client = new Client();

/** True when endpoint + project are set and Appwrite can be used. */
export const APPWRITE_CONFIGURED = !!(APPWRITE_ENDPOINT && APPWRITE_PROJECT);

if (APPWRITE_CONFIGURED) {
  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { client, APPWRITE_BUCKET, APPWRITE_DATABASE };
