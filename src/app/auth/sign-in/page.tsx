import Link from 'next/link';
import { loginAction } from '@/features/auth/actions/login';
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

export default function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your account credentials.</CardDescription>
      </CardHeader>
      <form action={loginAction}>
        <CardContent className='space-y-4'>
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
              autoComplete='current-password'
              required
            />
          </div>
        </CardContent>
        <CardFooter className='flex flex-col gap-3'>
          <Button type='submit' className='w-full'>
            Sign in
          </Button>
          <Button asChild variant='link' className='h-auto p-0'>
            <Link href='/auth/sign-up'>Create an account</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
