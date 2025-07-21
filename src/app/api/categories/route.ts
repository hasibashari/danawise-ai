// src/app/api/categories/route.ts
import { authOptions } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import * as z from "zod";

// Skema validasi untuk membuat kategori
const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = categorySchema.parse(body);

    const newCategory = await db.category.create({
      data: {
        name,
        userId: session.user.id,
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const categories = await db.category.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: "desc",
            }
        });

        return NextResponse.json(categories);
    } catch (_error) {
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
    }
}