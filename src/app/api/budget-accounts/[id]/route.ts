// src/app/api/budget-accounts/[id]/route.ts
import { authOptions } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateBudgetAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long").optional(),
  type: z.enum(["BANK", "EWALLET", "CASH", "INVESTMENT", "CREDIT_CARD"]).optional(),
  balance: z.number().min(0, "Balance cannot be negative").optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

// PUT: Update budget account
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: accountId } = await context.params;
    const body = await req.json();
    const validatedData = updateBudgetAccountSchema.parse(body);

    // Cek apakah budget account ada dan milik user
    const existingAccount = await db.budgetAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { message: "Budget account not found" },
        { status: 404 }
      );
    }

    // Jika mengubah nama, pastikan nama baru tidak duplikat
    if (validatedData.name && validatedData.name !== existingAccount.name) {
      const duplicateAccount = await db.budgetAccount.findFirst({
        where: {
          userId: session.user.id,
          name: validatedData.name,
          id: { not: accountId },
          isActive: true
        }
      });

      if (duplicateAccount) {
        return NextResponse.json(
          { message: "Account name already exists" },
          { status: 400 }
        );
      }
    }

    const updatedAccount = await db.budgetAccount.update({
      where: { id: accountId },
      data: validatedData,
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    return NextResponse.json(updatedAccount);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating budget account:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Hapus budget account (soft delete)
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: accountId } = await context.params;

    // Cek apakah budget account ada dan milik user
    const existingAccount = await db.budgetAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { message: "Budget account not found" },
        { status: 404 }
      );
    }

    // Cek apakah ada transaksi yang menggunakan budget account ini
    const transactionCount = await db.transaction.count({
      where: {
        budgetAccountId: accountId,
        userId: session.user.id,
      },
    });

    if (transactionCount > 0) {
      // Soft delete jika ada transaksi
      await db.budgetAccount.update({
        where: { id: accountId },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: "Budget account deactivated successfully",
        transactionCount,
      });
    } else {
      // Hard delete jika tidak ada transaksi
      await db.budgetAccount.delete({
        where: { id: accountId },
      });

      return NextResponse.json({
        message: "Budget account deleted successfully",
      });
    }
  } catch (error) {
    console.error("Error deleting budget account:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
