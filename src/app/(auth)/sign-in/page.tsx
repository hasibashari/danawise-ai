// src/app/(auth)/sign-in/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function SignInPage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (_error) {
      toast.error('Failed to sign in with Google. Please try again.');
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password,
      });

      if (result?.error) {
        toast.error('Invalid credentials. Please try again.');
      } else if (result?.ok) {
        toast.success('Successfully signed in!');
        router.push('/dashboard');
      }
    } catch (_error) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen'>
      <Card className='w-[350px]'>
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Welcome back to DanaWise AI.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tombol Google diletakkan di sini */}
          <Button variant='outline' className='w-full mb-4' onClick={handleGoogleSignIn}>
            {/* Anda bisa menambahkan ikon Google di sini jika mau */}
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
              <path
                d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
                fill='currentColor'
              />
            </svg>
            Sign In with Google
          </Button>

          <div className='relative mb-4'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>Or continue with</span>
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder='johndoe@example.com' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type='password' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit' className='w-full'>
                Sign In
              </Button>
            </form>
          </Form>
          <p className='text-center text-sm text-gray-600 mt-4'>
            Don't have an account?{' '}
            <Link href='/sign-up' className='text-blue-600 hover:underline'>
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
