import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Maximize2, 
  Minimize2,
  Trash2,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIChatAssistant: React.FC = () => {
  const { isChatOpen, setChatOpen } = useAppStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your FinLedger AI. Ask me anything about your financial data, budgets, or tax compliance." }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { financialYear } = useAppStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const doChat = async () => {
        return fetch('/api/v1/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ messages: [...messages, userMsg], financialYear }),
        });
      };

      let response = await doChat();

      // This component uses `fetch` (for streaming), so it bypasses the axios refresh interceptor.
      // If the access cookie expired but refresh cookie is still valid, refresh once and retry.
      if (response.status === 401) {
        try {
          await api.post('/auth/refresh');
          response = await doChat();
        } catch {
          // ignore; fall through to user-facing message
        }
      }

      if (!response.ok) throw new Error("Chat failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.replace('data: ', '');
          if (jsonStr === '[DONE]') break;

          try {
            const data = JSON.parse(jsonStr);
            if (data.delta) {
              assistantMsg += data.delta;

              setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = assistantMsg;
                return newMsgs;
              });
            }
          } catch (e) {
            console.warn("Parse error in stream", e);
          }
        }
      }
    } catch (err) {
      console.error("AI Chat error", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error processing your request. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isChatOpen) {
    return (
      <button 
        onClick={() => setChatOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 z-50 group"
      >
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-white animate-bounce" />
        <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-8 right-8 bg-card border rounded-2xl shadow-2xl flex flex-col transition-all duration-300 z-50 overflow-hidden",
      isMinimized ? "w-72 h-14" : "w-96 h-[550px]"
    )}>
      {/* Header */}
      <div className="p-4 bg-primary text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-white/10 rounded-lg">
            <Bot className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="text-sm font-heading font-black tracking-tight">FinLedger AI</div>
            <div className="text-[10px] text-white/60 font-medium">{user?.role.replace('_', ' ')} Intelligence</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setChatOpen(false)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5 scrollbar-hide">
            {messages.map((msg, i) => (
              <div key={i} className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === 'user' ? "ml-auto items-end" : "items-start"
              )}>
                {msg.role === 'assistant' && (
                  <div className="text-[10px] font-black uppercase text-muted-foreground mb-1 ml-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-accent" /> Intelligent Agent
                  </div>
                )}
                <div className={cn(
                  "p-3 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-accent text-white rounded-tr-none font-medium" 
                    : "bg-muted border rounded-tl-none text-foreground shadow-sm"
                )}>
                  {msg.content || (isTyping && i === messages.length - 1 ? <div className="flex gap-1 py-1"><div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" /><div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" /></div> : null)}
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-card">
            <div className="relative">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me about FY24 transactions..."
                className="w-full pl-4 pr-12 py-3 bg-muted/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent transition-all font-medium text-foreground placeholder:text-muted-foreground"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-1.5 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex justify-between items-center px-1">
               <div className="text-[9px] text-muted-foreground font-bold flex items-center gap-1">
                 <Trash2 onClick={() => setMessages([messages[0]])} className="w-3 h-3 cursor-pointer hover:text-destructive" /> Clear history
               </div>
               <div className="text-[9px] text-muted-foreground font-bold">Powered by Advanced AI</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIChatAssistant;
