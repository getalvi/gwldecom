'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Package, Truck, RotateCcw, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { useAuthStore, useNavigationStore } from '@/lib/store';

// ─── Types ───────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  message: string;
}

// ─── Constants ───────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Find Products', icon: <Package className="w-3.5 h-3.5" />, message: "I'm looking for some products. What are your popular items?" },
  { label: 'Check Order', icon: <Truck className="w-3.5 h-3.5" />, message: "Can you check the status of my recent orders?" },
  { label: 'Shipping Info', icon: <RotateCcw className="w-3.5 h-3.5" />, message: 'What are your shipping options and delivery times?' },
  { label: 'Help', icon: <HelpCircle className="w-3.5 h-3.5" />, message: 'What is your return and refund policy?' },
];

const WELCOME_MESSAGE = `Hi there! 👋 I'm **Nova AI**, your personal shopping assistant at **ShopNova**.

I can help you with:
- 🛍️ Finding the perfect products
- 📦 Checking order status
- 🚚 Shipping & delivery info
- ↩️ Returns, refunds & policies

How can I help you today?`;

// ─── Typing Indicator ────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5">
      <div className="flex items-center gap-1 bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
        <span className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}

// ─── Product Link Renderer ───────────────────────────────────

function ChatMarkdown({ content }: { content: string }) {
  const navigate = useNavigationStore((s) => s.navigate);

  return (
    <div className="prose prose-sm max-w-none text-gray-700 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-1.5 prose-strong:text-gray-900 prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline prose-a:cursor-pointer">
      <ReactMarkdown
        components={{
          // Intercept links that look like product links
          a: ({ href, children }) => {
            // Handle #product/{id} links
            if (href && href.startsWith('#product/')) {
              const productId = href.replace('#product/', '');
              return (
                <button
                  type="button"
                  onClick={() => navigate('product', { id: productId })}
                  className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 font-medium transition-colors"
                >
                  {children}
                </button>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:text-emerald-700"
              >
                {children}
              </a>
            );
          },
          // Style lists nicely
          ul: ({ children }) => <ul className="space-y-0.5 list-disc list-inside marker:text-emerald-500">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-0.5 list-decimal list-inside marker:text-emerald-500">{children}</ol>,
          li: ({ children }) => <li className="text-gray-700">{children}</li>,
          p: ({ children }) => <p className="text-gray-700 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="text-gray-900 font-semibold">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Main ChatBot Component ──────────────────────────────────

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const userId = useAuthStore((s) => s.user?.id);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-chatbot-toggle]')
      ) {
        setIsOpen(false);
      }
    }

    // Delay to avoid immediate closing from the toggle click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setHasInteracted(true);
      const userMessage: ChatMessage = { role: 'user', content: trimmed };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput('');
      setIsLoading(true);

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages,
            userId: userId || undefined,
          }),
        });

        const data = await res.json();
        const botReply: ChatMessage = {
          role: 'assistant',
          content: data.reply || "I'm sorry, I couldn't process that. Could you try again?",
        };
        setMessages((prev) => [...prev, botReply]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "I'm having a bit of trouble connecting right now. Please try again in a moment! 😊",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, userId]
  );

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Handle quick action
  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-[calc(100vw-2rem)] sm:w-[380px] h-[520px] sm:h-[560px] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-200/80 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Nova AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
                    <span className="text-emerald-100 text-xs">Online</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
              {/* Custom scrollbar via inline style */}
              <style>{`
                .chat-messages::-webkit-scrollbar { width: 5px; }
                .chat-messages::-webkit-scrollbar-track { background: transparent; }
                .chat-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; }
                .chat-messages::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
              `}</style>
              <div className="chat-messages space-y-3">
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'user' ? (
                      <div className="max-w-[80%] bg-emerald-600 text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="max-w-[85%] bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                        <ChatMarkdown content={msg.content} />
                      </div>
                    )}
                  </motion.div>
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Quick Actions (show before first user message) */}
            {!hasInteracted && (
              <div className="flex-shrink-0 px-4 pb-2">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleQuickAction(action.message)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-full px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex-shrink-0 border-t border-gray-100 p-3 bg-gray-50/50">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Nova anything..."
                  disabled={isLoading}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 disabled:opacity-50 transition-all"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="flex-shrink-0 w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-40 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        data-chatbot-toggle="true"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative w-14 h-14 rounded-full shadow-lg shadow-emerald-600/25 flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-gray-800 hover:bg-gray-900 shadow-gray-600/25'
            : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {/* Pulse ring (only when closed) */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20" />
        )}
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
