import { Account, Client, Databases, Storage } from 'appwrite';
import {
  APPWRITE_BUCKET,
  APPWRITE_DATABASE,
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT
} from './constants';

const client = new Client();

if (APPWRITE_ENDPOINT && APPWRITE_PROJECT) {
  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { client, APPWRITE_BUCKET, APPWRITE_DATABASE };
