// src/app/api/insight/route.ts
import { authOptions } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
// ...existing code...
import { NextResponse } from "next/server";

// Simple in-memory cache untuk insight
const insightCache = new Map<string, { insight: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Cek cache terlebih dahulu
    const cached = insightCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ insight: cached.insight });
    }

    // 1. Ambil 10 transaksi terakhir pengguna (optimasi: hanya ambil field yang diperlukan)
    const transactions = await db.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 10,
      select: { type: true, amount: true, description: true }
    });

    if (transactions.length === 0) {
        return NextResponse.json({ insight: "No transaction data available to analyze." });
    }

        // 2. Siapkan model Gemini dan buat prompt
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 150,
      },
    });
    
    // Calculate basic stats for better context
    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    
    const prompt = `Kamu adalah Dana, asisten keuangan AI yang ramah dalam Bahasa Indonesia. Analisis statistik keuangan dan transaksi terbaru ini, lalu berikan SATU tips yang dapat ditindaklanjuti dalam bahasa Indonesia. Maksimal 50 kata dan ramah.

Statistik:
- Total Pemasukan: Rp${totalIncome.toLocaleString('id-ID')}
- Total Pengeluaran: Rp${totalExpense.toLocaleString('id-ID')}
- Saldo: Rp${balance.toLocaleString('id-ID')}

Transaksi terbaru: ${JSON.stringify(transactions)}

Berikan tips yang membantu dan personal untuk meningkatkan kesehatan keuangan mereka.`;
    
    // 3. Hasilkan insight
    const result = await model.generateContent(prompt);
    const response = result.response;
    const insightText = response.text();

    // Simpan ke cache
    insightCache.set(userId, {
      insight: insightText,
      timestamp: Date.now()
    });

    const apiResponse = NextResponse.json({ insight: insightText });
    // Tambahkan cache headers
    apiResponse.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    
    return apiResponse;

  } catch (_error) {
    console.error("Insight API Error:", _error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}