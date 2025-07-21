// src/app/api/transactions/route.ts
import { authOptions } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const transactionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number"),
  description: z.string().min(1, "Description is required"),
  date: z.coerce.date(),
  categoryId: z.string().min(1, "Category is required"),
  type: z.enum(["INCOME", "EXPENSE"]),
  budgetAccountId: z.string().optional(), // Tambahan untuk budget account
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const parsedBody = transactionSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(parsedBody.error, { status: 400 });
    }

    const { amount, description, date, categoryId, type, budgetAccountId } = parsedBody.data;

    // Update balance pada budget account jika ada
    if (budgetAccountId) {
      const budgetAccount = await db.budgetAccount.findFirst({
        where: {
          id: budgetAccountId,
          userId: session.user.id,
          isActive: true
        }
      });

      if (!budgetAccount) {
        return NextResponse.json(
          { message: "Budget account not found" },
          { status: 400 }
        );
      }

      // Update balance: tambah untuk income, kurang untuk expense
      const balanceChange = type === "INCOME" ? amount : -amount;
      
      await db.budgetAccount.update({
        where: { id: budgetAccountId },
        data: {
          balance: {
            increment: balanceChange
          }
        }
      });
    }

    const newTransaction = await db.transaction.create({
      data: {
        userId: session.user.id,
        amount,
        description,
        date,
        categoryId,
        type,
        budgetAccountId,
      },
    });

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (_error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Tambahkan pagination untuk performa yang lebih baik
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [transactions, totalCount] = await Promise.all([
      db.transaction.findMany({
        where: {
          userId: session.user.id,
        },
        include: {
          category: true,
          budgetAccount: true, // Include budget account data
        },
        orderBy: {
          date: "desc",
        },
        skip,
        take: limit,
      }),
      db.transaction.count({
        where: {
          userId: session.user.id,
        },
      }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }
    });
  } catch (_error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}