// src/app/(main)/dashboard/page.tsx
import { DashboardClient } from '@/components/features/dashboard-client';
import { authOptions } from '@/app/lib/auth';
import { db } from '@/app/lib/db';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

// Halaman dashboard sebagai server component
// Jika user belum login, langsung redirect ke sign-in dari server
const DashboardPage = async () => {
  const session = await getServerSession(authOptions);
  // Jika session null, redirect ke sign-in agar user tidak bisa akses dashboard tanpa login
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  const userId = session.user.id;

  // Optimasi: Gunakan Promise.all untuk query paralel dan raw query untuk performa
  const [totalIncome, totalExpense, recentTransactions, budgetAccounts] = await Promise.all([
    db.transaction.aggregate({
      where: { userId, type: 'INCOME' },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { userId, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
    db.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        category: true,
        budgetAccount: true,
      },
    }),
    db.budgetAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { balance: 'desc' },
      take: 5,
    }),
  ]);

  // Ambil semua data yang dibutuhkan di server

  const expenseByCategory = await db.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, type: 'EXPENSE' },
    _sum: { amount: true },
  });
  const categoryIds = expenseByCategory.map(item => item.categoryId);
  const categories = await db.category.findMany({ where: { id: { in: categoryIds } } });
  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

  const categoryData = expenseByCategory
    .map(item => ({
      name: categoryMap.get(item.categoryId) ?? 'Lainnya',
      value: item._sum.amount ?? 0,
    }))
    .slice(0, 5); // Ambil top 5

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const timeSeriesRaw = await db.transaction.findMany({
    where: { userId, date: { gte: thirtyDaysAgo } },
    select: { date: true, amount: true, type: true },
    orderBy: { date: 'asc' },
  });

  const stats = {
    income: totalIncome._sum.amount ?? 0,
    expense: totalExpense._sum.amount ?? 0,
    balance: (totalIncome._sum.amount ?? 0) - (totalExpense._sum.amount ?? 0),
  };

  // Render dashboard client jika user sudah login
  return (
    <DashboardClient
      stats={stats}
      recentTransactions={recentTransactions}
      categoryData={categoryData}
      timeSeriesData={timeSeriesRaw}
      budgetAccounts={budgetAccounts}
    />
  );
};

export default DashboardPage;
