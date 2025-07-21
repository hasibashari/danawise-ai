# Setup Guide untuk DanaWise AI

## Environment Variables yang Diperlukan

Buat file `.env.local` di root folder dan tambahkan:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/danawise_ai"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key-here"
```

## Perubahan Penting

1. **Menghilangkan useChat Deprecated**: Sekarang menggunakan custom implementation yang lebih stabil
2. **Environment Variable**: Menggunakan `GOOGLE_GENERATIVE_AI_API_KEY` untuk Gemini API
3. **Manual Chat Implementation**: Chat sekarang menggunakan fetch API langsung untuk kontrol penuh
4. **Better Error Handling**: Error message yang lebih informatif dengan toast notifications
5. **Real-time Streaming**: Response AI ditampilkan secara real-time saat streaming

## Fitur yang Diperbaiki

- ✅ **AI Chat Agent**: Implementasi manual tanpa dependency deprecated
- ✅ **Real-time Streaming**: Response AI muncul secara bertahap
- ✅ **Error Handling**: Toast notification untuk error yang user-friendly
- ✅ **Message Management**: State management manual untuk kontrol penuh
- ✅ **Loading States**: Indikator loading yang jelas
- ✅ **Indonesian Language**: Semua response dalam Bahasa Indonesia

## Cara Test

1. Pastikan semua environment variables sudah diset
2. Restart development server: `npm run dev`
3. Buka `/agent` dan coba kirim pesan
4. Response AI akan muncul secara real-time saat streaming

## Troubleshooting

- Jika muncul "API Key not configured": Pastikan `GOOGLE_GENERATIVE_AI_API_KEY` sudah diset
- Jika chat tidak muncul: Cek browser console untuk error
- Jika streaming error: Pastikan API key valid dan tidak expired
- Jika ada toast error: Periksa network tab di browser untuk detail response
