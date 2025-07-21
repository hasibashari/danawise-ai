// src/app/api/categories/[id]/route.ts
import { authOptions } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: categoryId } = await context.params;

    // Cek apakah kategori milik user yang sedang login
    const category = await db.category.findFirst({
      where: {
        id: categoryId,
        userId: session.user.id,
      },
    });

    if (!category) {
      return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }

    // Cek apakah ada transaksi yang menggunakan kategori ini
    const transactionCount = await db.transaction.count({
      where: {
        categoryId: categoryId,
        userId: session.user.id,
      },
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        { 
          message: `Cannot delete category. It is being used by ${transactionCount} transaction(s).`,
          canDelete: false 
        }, 
        { status: 400 }
      );
    }

    // Hapus kategori jika tidak digunakan
    await db.category.delete({
      where: {
        id: categoryId,
      },
    });

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
