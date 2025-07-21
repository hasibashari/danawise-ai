// src/components/features/ai-agent-client.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AiAgentClient = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        // Use setTimeout to ensure DOM is updated first
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 10);
      }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body available');
      }

      let assistantContent = '';
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      // Add empty assistant message first
      setMessages(prev => [...prev, assistantMessage]);

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        // Update the assistant message content
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id ? { ...msg, content: assistantContent } : msg
          )
        );
      }

      // Ensure we have some content
      if (!assistantContent.trim()) {
        throw new Error('Empty response from AI');
      }
    } catch (chatError) {
      console.error('Chat error:', chatError);

      let errorMessage = 'Terjadi kesalahan saat mengirim pesan. Silakan coba lagi.';
      if (chatError instanceof Error) {
        if (chatError.message.includes('401')) {
          errorMessage = 'Anda perlu login terlebih dahulu.';
        } else if (chatError.message.includes('500')) {
          errorMessage = 'API Key tidak valid atau server error.';
        }
      }

      toast.error(errorMessage);

      // Remove user message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className='h-[80vh] flex flex-col max-w-4xl mx-auto'>
      <CardHeader className='flex-shrink-0 border-b'>
        <CardTitle className='flex items-center gap-2'>
          <Bot className='h-6 w-6' />
          Dana - Asisten Keuangan AI
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-grow flex flex-col p-0 overflow-hidden'>
        {/* Area untuk menampilkan pesan chat */}
        <div className='flex-grow overflow-hidden'>
          <ScrollArea className='h-full px-4 py-4' ref={scrollAreaRef}>
            <div className='space-y-4 pr-4 min-h-0'>
              {/* Welcome message jika belum ada pesan */}
              {messages.length === 0 && (
                <div className='flex items-start gap-3 justify-start'>
                  <Avatar className='flex-shrink-0'>
                    <AvatarFallback className='bg-blue-100'>
                      <Bot className='h-4 w-4 text-blue-600' />
                    </AvatarFallback>
                  </Avatar>
                  <div className='p-4 rounded-lg max-w-md bg-muted shadow-sm'>
                    <div className='font-medium text-blue-600 mb-2'>
                      Halo! Saya Dana, asisten keuangan AI Anda 👋
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      Silakan tanyakan tentang keuangan Anda, seperti:
                      <br />• "Bagaimana pola pengeluaran saya?"
                      <br />• "Tips hemat untuk bulan ini?"
                      <br />• "Analisis transaksi terakhir saya"
                    </div>
                  </div>
                </div>
              )}

              {messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    'flex items-start gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className='flex-shrink-0'>
                      <AvatarFallback className='bg-blue-100'>
                        <Bot className='h-4 w-4 text-blue-600' />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'p-4 rounded-lg max-w-md whitespace-pre-wrap break-words shadow-sm',
                      message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    {message.content || (message.role === 'assistant' && '...')}
                  </div>
                  {message.role === 'user' && (
                    <Avatar className='flex-shrink-0'>
                      <AvatarFallback className='bg-green-100'>
                        <User className='h-4 w-4 text-green-600' />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className='flex items-start gap-3 justify-start'>
                  <Avatar className='flex-shrink-0'>
                    <AvatarFallback className='bg-blue-100'>
                      <Bot className='h-4 w-4 text-blue-600' />
                    </AvatarFallback>
                  </Avatar>
                  <div className='p-4 rounded-lg max-w-md bg-muted shadow-sm'>
                    <div className='flex items-center gap-2'>
                      <div className='animate-pulse'>💭</div>
                      <span className='text-sm'>Dana sedang berpikir...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Add some bottom padding for better UX */}
              <div className='h-4'></div>
            </div>
          </ScrollArea>
        </div>

        {/* Form untuk input pengguna */}
        <div className='flex-shrink-0 border-t bg-background p-4'>
          <form onSubmit={handleSubmit} className='flex items-center gap-2 max-w-4xl mx-auto'>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder='Tanyakan tentang keuangan Anda...'
              disabled={isLoading}
              className='flex-1'
              autoComplete='off'
            />
            <Button type='submit' disabled={isLoading || !input.trim()}>
              {isLoading ? 'Mengirim...' : 'Kirim'}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};
