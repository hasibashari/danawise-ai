// src/app/(main)/budget-accounts/page.tsx
import { BudgetAccountsClient } from '@/components/features/budget-accounts-client';
import { authOptions } from '@/app/lib/auth';
import { db } from '@/app/lib/db';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

const BudgetAccountsPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Ambil data budget accounts dengan informasi statistik
  const budgetAccounts = await db.budgetAccount.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <BudgetAccountsClient initialBudgetAccounts={budgetAccounts} />;
};

export default BudgetAccountsPage;
