// src/app/api/chat/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Define interfaces
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TransactionWithCategory {
  id: string;
  amount: number;
  type: string;
  date: Date;
  description: string | null;
  category: {
    name: string;
  };
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Validate API Key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Gemini API Key not configured" }), 
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in." }), 
        { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Parse request body
    let messages: Message[] = [];
    try {
      const body = await req.json();
      console.log("Received body:", body); // Debug log
      messages = body.messages || [];
      
      // Validate messages format
      if (!Array.isArray(messages)) {
        console.error("Messages is not an array:", messages);
        throw new Error("Messages must be an array");
      }
      
      for (const msg of messages) {
        if (!msg.role || !msg.content || !["user", "assistant"].includes(msg.role)) {
          console.error("Invalid message format:", msg);
          throw new Error("Invalid message format");
        }
      }
    } catch (_error) {
      console.error("Request body parsing error:", _error);
      return new Response(
        JSON.stringify({ error: "Invalid request body format" }), 
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }), 
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 1. Fetch user's financial data as context
    let transactions: TransactionWithCategory[] = [];
    try {
      transactions = await db.transaction.findMany({
        where: { userId: session.user.id },
        include: {
          category: {
            select: {
              name: true,
            }
          }
        },
        orderBy: { date: "desc" },
        take: 20,
      });
    } catch (_error) {
      console.error("Failed to fetch transactions:", _error);
      // If data fetch fails, continue with empty transactions
      transactions = [];
    }

    // 2. Create system prompt with transaction data
    const systemPrompt = `Kamu adalah "Dana," asisten keuangan AI yang ramah dan ahli untuk aplikasi DanaWise AI.
Tujuanmu adalah membantu pengguna memahami keuangan mereka dan membuat keputusan yang lebih cerdas.

Pedoman:
- Selalu gunakan Bahasa Indonesia yang ramah dan mudah dipahami
- Gunakan data transaksi yang diberikan untuk memberikan jawaban yang spesifik dan berdasarkan data
- Jika tidak tahu jawabannya atau data tidak cukup, katakan dengan jujur
- Berikan respons yang ringkas tapi membantu
- Format angka sebagai mata uang Rupiah (Rp) saat membahas uang
- Berikan saran yang dapat ditindaklanjuti jika memungkinkan
- Panggil pengguna dengan sebutan yang ramah seperti "Kak" atau "Anda"
- Gunakan emoticon yang sesuai untuk membuat percakapan lebih friendly

Data transaksi pengguna (format JSON):
${JSON.stringify(transactions, null, 2)}

Ingat: Data ini bersifat pribadi dan rahasia. Hanya gunakan untuk membantu pengguna ini secara spesifik.`;

    // 3. Initialize Gemini model and create chat
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1200,
      },
    });

    // 4. Create chat history for context
    const chatHistory = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model",
        parts: [
          {
            text: "Halo! Saya Dana, asisten keuangan AI Anda 👋\n\nSaya siap membantu Anda menganalisis pola pengeluaran, melacak pemasukan dan pengeluaran, serta memberikan wawasan untuk meningkatkan kesehatan keuangan Anda.\n\nAda yang bisa saya bantu hari ini? 😊",
          },
        ],
      },
      // Convert message history to Gemini format
      ...messages.slice(0, -1).map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })),
    ];

    const chat = model.startChat({
      history: chatHistory,
    });

    // 5. Get the latest user message and send to Gemini
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role !== "user") {
      return new Response(
        JSON.stringify({ error: "Last message must be from user" }), 
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    console.log("Sending message to Gemini:", lastUserMessage.content);

    // 6. Stream the response
    const result = await chat.sendMessageStream(lastUserMessage.content);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }
        } catch (streamError) {
          console.error("Error streaming response:", streamError);
          controller.enqueue(
            new TextEncoder().encode("Maaf, terjadi kesalahan saat memproses respons. Silakan coba lagi.")
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (apiError) {
    console.error("Chat API Error:", apiError);
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}