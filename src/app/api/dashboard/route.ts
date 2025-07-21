import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { db } from '@/app/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Optimasi: Gunakan Promise.all untuk query paralel
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
          budgetAccount: true 
        },
      }),
      db.budgetAccount.findMany({
        where: { userId, isActive: true },
        orderBy: { balance: 'desc' },
        take: 5,
      }),
    ]);

    // Ambil data expense by category
    const expenseByCategory = await db.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'EXPENSE' },
      _sum: { amount: true },
    });

    type ExpenseByCategory = { categoryId: string; _sum: { amount: number | null } };
    type Category = { id: string; name: string };
    const categoryIds = expenseByCategory.map((item: ExpenseByCategory) => item.categoryId);
    const categories = await db.category.findMany({ 
      where: { id: { in: categoryIds } } 
    });
    const categoryMap = new Map(categories.map((cat: Category) => [cat.id, cat.name]));

    const categoryData = expenseByCategory
      .map((item: ExpenseByCategory) => ({
        name: categoryMap.get(item.categoryId) ?? 'Lainnya',
        value: item._sum.amount ?? 0,
      }))
      .slice(0, 5); // Ambil top 5

    // Ambil semua transaksi untuk 30 hari terakhir, sertakan relasi akun dan kategori
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const timeSeriesData = await db.transaction.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' },
      include: {
        budgetAccount: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
      },
    });

    // Debug: Log data structure untuk memastikan include bekerja
    console.log('🔍 API Debug - timeSeriesData sample:', timeSeriesData.slice(0, 2));
    if (timeSeriesData.length > 0) {
      console.log('🔍 API Debug - First transaction:', JSON.stringify(timeSeriesData[0], null, 2));
    }

    const stats = {
      income: totalIncome._sum.amount ?? 0,
      expense: totalExpense._sum.amount ?? 0,
      balance: (totalIncome._sum.amount ?? 0) - (totalExpense._sum.amount ?? 0),
    };

    return NextResponse.json({
      stats,
      recentTransactions,
      categoryData,
      timeSeriesData,
      budgetAccounts,
    });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}