// src/app/(main)/categories/page.tsx
import { CategoriesClient } from '@/components/features/categories-client';
import { db } from '@/app/lib/db';
import { authOptions } from '@/app/lib/auth';
import { getServerSession } from 'next-auth';

const CategoriesPage = async () => {
  const session = await getServerSession(authOptions);

  // Ambil data di server
  const categories = await db.category.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return <CategoriesClient initialCategories={categories} />;
};

export default CategoriesPage;
