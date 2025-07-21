// src/app/api/user/route.ts
import { db } from "@/app/lib/db";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import * as z from "zod";

// Definisikan skema validasi
const userSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must have at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = userSchema.parse(body);

    // Cek apakah email sudah ada
    const existingUser = await db.user.findUnique({
      where: { email: email },
    });
    if (existingUser) {
      return NextResponse.json(
        { user: null, message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Enkripsi password dan buat user baru
    const hashedPassword = await hash(password, 10);
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { user: newUser, message: "User created successfully" },
      { status: 201 }
    );
  } catch (_error) {
    return NextResponse.json(
      { message: "Something went wrong!" },
      { status: 500 }
    );
  }
}