// src/components/features/profile-client.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Calendar, Camera, Save, Loader2, FileText, Wallet, Tags } from 'lucide-react';
import { format } from 'date-fns';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  image: z.string().url('Invalid image URL').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Type untuk user dengan count
type UserWithCount = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    transactions: number;
    categories: number;
    budgetAccounts: number;
  };
};

interface ProfileClientProps {
  user: UserWithCount;
}

// Currency formatter
export const ProfileClient = ({ user }: ProfileClientProps) => {
  const { data: session, update: updateSession } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      image: user.image || '',
    },
  });

  // Handle form submission
  const onSubmit = useCallback(
    async (values: ProfileFormValues) => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update profile');
        }

        const updatedUser = await response.json();

        // Update session dengan data terbaru
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            name: updatedUser.name,
            email: updatedUser.email,
            image: updatedUser.image,
          },
        });

        toast.success('Profile updated successfully!');
      } catch (_error) {
        toast.error('Failed to update profile');
      } finally {
        setIsLoading(false);
      }
    },
    [session, updateSession]
  );

  // Handle image upload (simulation - in production, use cloud storage)
  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error('Image must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      setIsUploadingImage(true);

      try {
        // In production, upload to cloud storage (AWS S3, Cloudinary, etc.)
        // For now, we'll use FileReader to convert to data URL
        const reader = new FileReader();
        reader.onload = e => {
          const imageUrl = e.target?.result as string;
          form.setValue('image', imageUrl);
          setIsUploadingImage(false);
          toast.success('Image uploaded successfully!');
        };
        reader.onerror = () => {
          setIsUploadingImage(false);
          toast.error('Failed to upload image');
        };
        reader.readAsDataURL(file);
      } catch (_error) {
        setIsUploadingImage(false);
        toast.error('Failed to upload image');
      }
    },
    [form]
  );

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h2 className='text-3xl font-bold'>Profile Settings</h2>
        <p className='text-muted-foreground'>Manage your account settings and preferences</p>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Profile Info Card */}
        <div className='lg:col-span-1'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <User className='h-5 w-5' />
                Profile Information
              </CardTitle>
              <CardDescription>Your basic account information</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Avatar Section */}
              <div className='flex flex-col items-center space-y-4'>
                <div className='relative'>
                  <Avatar className='h-24 w-24'>
                    <AvatarImage
                      src={form.watch('image') || user.image || ''}
                      alt={user.name || ''}
                    />
                    <AvatarFallback className='text-2xl'>
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size='sm'
                    variant='outline'
                    className='absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0'
                    onClick={triggerImageUpload}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Camera className='h-4 w-4' />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    onChange={handleImageUpload}
                    className='hidden'
                  />
                </div>
                <div className='text-center'>
                  <p className='font-medium'>{user.name}</p>
                  <p className='text-sm text-muted-foreground'>{user.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className='space-y-3 pt-4 border-t'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <FileText className='h-4 w-4 text-muted-foreground' />
                    <span className='text-sm'>Transactions</span>
                  </div>
                  <span className='font-medium'>{user._count.transactions}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Tags className='h-4 w-4 text-muted-foreground' />
                    <span className='text-sm'>Categories</span>
                  </div>
                  <span className='font-medium'>{user._count.categories}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Wallet className='h-4 w-4 text-muted-foreground' />
                    <span className='text-sm'>Budget Accounts</span>
                  </div>
                  <span className='font-medium'>{user._count.budgetAccounts}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Calendar className='h-4 w-4 text-muted-foreground' />
                    <span className='text-sm'>Member since</span>
                  </div>
                  <span className='text-sm font-medium'>
                    {format(new Date(user.createdAt), 'MMM yyyy')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
        <div className='lg:col-span-2'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <User className='h-5 w-5' />
                Edit Profile
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                  <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder='Enter your full name' {...field} />
                        </FormControl>
                        <FormDescription>
                          This is your display name that will be shown throughout the app.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type='email' placeholder='Enter your email address' {...field} />
                        </FormControl>
                        <FormDescription>
                          This email will be used for account authentication and notifications.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='image'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image URL (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type='url'
                            placeholder='https://example.com/image.jpg'
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          You can also upload an image using the camera button above.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className='flex justify-end pt-4'>
                    <Button type='submit' disabled={isLoading} className='w-full sm:w-auto'>
                      {isLoading ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className='mr-2 h-4 w-4' />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
