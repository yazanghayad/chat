'use server';

import { createAdminClient } from '@/lib/appwrite/server';

export interface ForgotPasswordResult {
  success?: boolean;
  error?: string;
}

/**
 * Step 1: Request password recovery email.
 * Appwrite sends a recovery link to the user's email via configured SMTP.
 */
export async function forgotPasswordAction(
  _prev: ForgotPasswordResult | null,
  formData: FormData
): Promise<ForgotPasswordResult> {
  const email = formData.get('email')?.toString().trim();

  if (!email) {
    return { error: 'Email is required.' };
  }

  try {
    const { account } = createAdminClient();

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/auth/reset-password`;

    await account.createRecovery(email, redirectUrl);

    return { success: true };
  } catch {
    // Don't reveal if email exists or not (security)
    return { success: true };
  }
}
