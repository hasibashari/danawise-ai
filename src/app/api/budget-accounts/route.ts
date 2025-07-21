// src/app/api/budget-accounts/route.ts
import { authOptions } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

// Schema untuk validasi input
const budgetAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  type: z.enum(["BANK", "EWALLET", "CASH", "INVESTMENT", "CREDIT_CARD"]),
  balance: z.number().min(0, "Balance cannot be negative"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

// GET: Ambil semua budget accounts milik user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const budgetAccounts = await db.budgetAccount.findMany({
      where: { 
        userId: session.user.id,
        isActive: true 
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    return NextResponse.json(budgetAccounts);
  } catch (error) {
    console.error("Error fetching budget accounts:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Buat budget account baru
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = budgetAccountSchema.parse(body);

    // Cek apakah nama sudah digunakan oleh user ini
    const existingAccount = await db.budgetAccount.findFirst({
      where: {
        userId: session.user.id,
        name: validatedData.name,
        isActive: true
      }
    });

    if (existingAccount) {
      return NextResponse.json(
        { message: "Account name already exists" },
        { status: 400 }
      );
    }

    const budgetAccount = await db.budgetAccount.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    return NextResponse.json(budgetAccount, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating budget account:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
