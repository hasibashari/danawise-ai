// src/app/(main)/transactions/page.tsx
import { TransactionsClient } from '@/components/features/transactions-client';
import { authOptions } from '@/app/lib/auth';
import { db } from '@/app/lib/db';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

const TransactionsPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const userId = session.user.id;

  // Optimasi: Load data paralel dan hanya ambil initial batch untuk performa
  const [initialTransactions, categories, budgetAccounts] = await Promise.all([
    db.transaction.findMany({
      where: { userId },
      include: {
        category: true,
        budgetAccount: { select: { id: true, name: true, type: true } },
      },
      orderBy: { date: 'desc' },
      take: 10, // Hanya ambil 10 pertama untuk initial load
    }),
    db.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' }, // Sort categories alphabetically
    }),
    db.budgetAccount.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <TransactionsClient
      initialTransactions={initialTransactions}
      categories={categories}
      budgetAccounts={budgetAccounts}
    />
  );
};

export default TransactionsPage;
