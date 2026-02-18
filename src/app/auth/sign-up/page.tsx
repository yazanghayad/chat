'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { signupAction } from '@/features/auth/actions/signup';
import type { AuthResult } from '@/features/auth/actions/login';
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

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'optitech.software';

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState<
    AuthResult | null,
    FormData
  >(signupAction, null);
  const [subdomain, setSubdomain] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          Set up your workspace and choose your subdomain.
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
            <label className='text-sm font-medium' htmlFor='name'>
              Name
            </label>
            <Input id='name' name='name' type='text' required />
          </div>
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
          <div className='space-y-2'>
            <label className='text-sm font-medium' htmlFor='password'>
              Password
            </label>
            <Input
              id='password'
              name='password'
              type='password'
              autoComplete='new-password'
              required
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium' htmlFor='subdomain'>
              Workspace Subdomain
            </label>
            <div className='flex items-center gap-0'>
              <Input
                id='subdomain'
                name='subdomain'
                type='text'
                placeholder='my-company'
                required
                className='rounded-r-none'
                value={subdomain}
                onChange={(e) =>
                  setSubdomain(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                  )
                }
                minLength={3}
                maxLength={63}
              />
              <span className='bg-muted text-muted-foreground flex h-9 items-center rounded-r-md border border-l-0 px-3 text-sm'>
                .{ROOT_DOMAIN}
              </span>
            </div>
            {subdomain && (
              <p className='text-muted-foreground text-xs'>
                Your portal will be at{' '}
                <span className='font-medium'>
                  {subdomain}.{ROOT_DOMAIN}
                </span>
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className='flex flex-col gap-3'>
          <Button type='submit' className='w-full' disabled={isPending}>
            {isPending ? 'Creating account…' : 'Create account'}
          </Button>
          <Button asChild variant='link' className='h-auto p-0'>
            <Link href='/auth/sign-in'>Back to sign in</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
