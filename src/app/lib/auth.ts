// src/lib/auth.ts
// DEBUG: Cek apakah env variable Google sudah terbaca
// console.log("GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID);
// console.log("GOOGLE_CLIENT_SECRET", process.env.GOOGLE_CLIENT_SECRET ? "[SET]" : "[NOT SET]");
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";
import bcrypt from "bcryptjs";

// Konfigurasi NextAuth tanpa PrismaAdapter, session sepenuhnya JWT
export const authOptions: NextAuthOptions = {
    // Gunakan strategi session berbasis JWT
    session: {
        strategy: "jwt",
        maxAge: 2 * 60 * 60, // contoh: 2 jam (dalam detik)
    },
    pages: {
        signIn: "/sign-in", // Arahkan pengguna ke halaman sign-in
    },
    // Konfigurasi provider, kita mulai dengan email dan password
    providers: [
         GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // Cari pengguna di database
                const existingUser = await db.user.findUnique({
                    where: { email: credentials.email },
                });
                if (!existingUser) {
                    return null;
                }

                // Cocokkan password
                const passwordMatch = await bcrypt.compare(
                    credentials.password,
                    existingUser.password!
                );
                if (!passwordMatch) {
                    return null;
                }

                // Jika semua cocok, kembalikan data user
                return {
                    id: existingUser.id,
                    name: existingUser.name,
                    email: existingUser.email,
                };
            },
        }),
    ],
    // Callbacks untuk menambahkan informasi ke session/token
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                return {
                    ...token,
                    id: user.id,
                    name: user.name,
                };
            }
            return token;
        },
        async session({ session, token }) {
            return {
                ...session,
                user: {
                    ...session.user,
                    id: token.id,
                    name: token.name,
                },
            };
        },
    },
};