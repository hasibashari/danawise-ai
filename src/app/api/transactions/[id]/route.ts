// src/app/api/transactions/[id]/route.ts
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
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const params = await context.params;
    const transactionId = params.id;

    // Cek apakah transaksi ada dan milik user yang sedang login
    const transactionToDelete = await db.transaction.findUnique({
      where: {
        id: transactionId,
        userId: session.user.id, // Keamanan: pastikan user hanya bisa hapus miliknya
      },
    });

    if (!transactionToDelete) {
      return new NextResponse("Transaction not found or access denied", { status: 404 });
    }

    await db.transaction.delete({
      where: {
        id: transactionId,
      },
    });

    return new NextResponse(null, { status: 204 }); // 204 No Content adalah respons standar untuk DELETE yang sukses
  } catch (_error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}