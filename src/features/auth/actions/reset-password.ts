'use server';

import { createAdminClient } from '@/lib/appwrite/server';

export interface ResetPasswordResult {
  success?: boolean;
  error?: string;
}

/**
 * Step 2: Complete password recovery.
 * Called after user clicks the recovery link in their email.
 * Appwrite appends ?userId=...&secret=... to the redirect URL.
 */
export async function resetPasswordAction(
  _prev: ResetPasswordResult | null,
  formData: FormData
): Promise<ResetPasswordResult> {
  const userId = formData.get('userId')?.toString();
  const secret = formData.get('secret')?.toString();
  const password = formData.get('password')?.toString();
  const confirmPassword = formData.get('confirmPassword')?.toString();

  if (!userId || !secret) {
    return { error: 'Invalid or expired reset link.' };
  }

  if (!password || !confirmPassword) {
    return { error: 'Password is required.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  try {
    const { account } = createAdminClient();
    await account.updateRecovery(userId, secret, password);
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to reset password. The link may have expired.';
    return { error: message };
  }
}
