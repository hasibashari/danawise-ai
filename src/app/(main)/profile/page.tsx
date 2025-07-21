// src/app/(main)/profile/page.tsx
import { ProfileClient } from '@/components/features/profile-client';
import { authOptions } from '@/app/lib/auth';
import { db } from '@/app/lib/db';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

const ProfilePage = async () => {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Ambil data user lengkap dari database
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      _count: {
        select: {
          transactions: true,
          categories: true,
          budgetAccounts: true,
        }
      }
    }
  });

  if (!user) {
    redirect('/sign-in');
  }

  return <ProfileClient user={user} />;
};

export default ProfilePage;
