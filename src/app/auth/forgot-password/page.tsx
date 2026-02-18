'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  forgotPasswordAction,
  type ForgotPasswordResult
} from '@/features/auth/actions/forgot-password';
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

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState<
    ForgotPasswordResult | null,
    FormData
  >(forgotPasswordAction, null);

  if (state?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account with that email exists, we&apos;ve sent a password
            reset link. Check your inbox (and spam folder).
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant='link' className='h-auto p-0'>
            <Link href='/auth/sign-in'>Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className='space-y-4'>
          {state?.error && (
            <div className='border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm'>
              {state.error}
            </div>
          )}
          <div className='space-y-2'>
            <label className='text-sm font-medium' htmlFor='email'>
              Email
            </label>
            <Input
              id='email'
              name='email'
              type='email'
              autoComplete='email'
              required
            />
          </div>
        </CardContent>
        <CardFooter className='flex flex-col gap-3'>
          <Button type='submit' className='w-full' disabled={isPending}>
            {isPending ? 'Sending…' : 'Send reset link'}
          </Button>
          <Button asChild variant='link' className='h-auto p-0'>
            <Link href='/auth/sign-in'>Back to sign in</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
