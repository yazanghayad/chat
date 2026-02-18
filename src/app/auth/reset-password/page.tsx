'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  resetPasswordAction,
  type ResetPasswordResult
} from '@/features/auth/actions/reset-password';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') ?? '';
  const secret = searchParams.get('secret') ?? '';

  const [state, formAction, isPending] = useActionState<
    ResetPasswordResult | null,
    FormData
  >(resetPasswordAction, null);

  if (!userId || !secret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant='link' className='h-auto p-0'>
            <Link href='/auth/forgot-password'>Request a new link</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (state?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>
            Your password has been reset successfully.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className='w-full'>
            <Link href='/auth/sign-in'>Sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Enter your new password.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input type='hidden' name='userId' value={userId} />
        <input type='hidden' name='secret' value={secret} />
        <CardContent className='space-y-4'>
          {state?.error && (
            <div className='border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm'>
              {state.error}
            </div>
          )}
          <div className='space-y-2'>
            <label className='text-sm font-medium' htmlFor='password'>
              New password
            </label>
            <Input
              id='password'
              name='password'
              type='password'
              autoComplete='new-password'
              minLength={8}
              required
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium' htmlFor='confirmPassword'>
              Confirm password
            </label>
            <Input
              id='confirmPassword'
              name='confirmPassword'
              type='password'
              autoComplete='new-password'
              minLength={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter className='flex flex-col gap-3'>
          <Button type='submit' className='w-full' disabled={isPending}>
            {isPending ? 'Resetting…' : 'Reset password'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Loading…</CardTitle>
          </CardHeader>
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
