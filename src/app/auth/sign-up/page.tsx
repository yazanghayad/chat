import Link from 'next/link';
import { signupAction } from '@/features/auth/actions/signup';
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

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Set up your workspace access.</CardDescription>
      </CardHeader>
      <form action={signupAction}>
        <CardContent className='space-y-4'>
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
        </CardContent>
        <CardFooter className='flex flex-col gap-3'>
          <Button type='submit' className='w-full'>
            Create account
          </Button>
          <Button asChild variant='link' className='h-auto p-0'>
            <Link href='/auth/sign-in'>Back to sign in</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
