import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X, Trash2, Heart } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '@/store/useStore';
import { agentApi } from '@/lib/api';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Button } from '@/components/ui/Button';
import type { ChatMessage as ChatMessageType } from '@/types';

export function ChatWidget() {
  const { chatOpen, setChatOpen, chatHistory, addMessage, clearChat, sessionId, activeScanId } = useStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  const sendMutation = useMutation({
    mutationFn: agentApi.chat,
    onMutate: () => setIsTyping(true),
    onSuccess: (data) => {
      setIsTyping(false);
      addMessage({
        id: uuidv4(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      });
    },
    onError: () => {
      setIsTyping(false);
      addMessage({
        id: uuidv4(),
        role: 'assistant',
        content: 'I apologize, I encountered an error. Please check the backend connection and try again.',
        timestamp: new Date().toISOString(),
      });
    },
  });

  const handleSend = (message: string) => {
    const userMsg: ChatMessageType = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);

    sendMutation.mutate({
      message,
      session_id: sessionId,
      scan_id: activeScanId ?? undefined,
    });
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  // Welcome message on first open
  useEffect(() => {
    if (chatOpen && chatHistory.length === 0) {
      addMessage({
        id: uuidv4(),
        role: 'assistant',
        content: activeScanId
          ? `Hello! I'm Dr. CardioBot 🩺 I can see you're viewing a scan. I can help you understand the ECG findings, anomaly scores, and what they might mean clinically. What would you like to know?`
          : `Hello! I'm Dr. CardioBot 🩺 I'm your AI cardiology assistant. I can help you understand ECG readings, explain anomaly scores, and answer questions about heart health. How can I help you today?`,
        timestamp: new Date().toISOString(),
      });
    }
  }, [chatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-glow-primary border border-primary/50"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        animate={chatOpen ? {} : { boxShadow: ['0 0 10px #00d4aa80', '0 0 25px #00d4aa40', '0 0 10px #00d4aa80'] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <AnimatePresence mode="wait">
          {chatOpen ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6 text-[#0a0f1e]" />
            </motion.div>
          ) : (
            <motion.div key="heart" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <Heart className="h-6 w-6 text-[#0a0f1e] animate-heartbeat" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[360px] flex-col rounded-2xl border border-white/15 bg-[#0a0f1e] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-white/3 px-4 py-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                <Activity className="h-4.5 w-4.5 text-primary animate-heartbeat" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100">Dr. CardioBot</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <p className="text-[11px] text-slate-500">AI Cardiology Assistant</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearChat} title="Clear chat">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-primary animate-heartbeat" />
                  </div>
                  <p className="text-sm text-slate-500">Start a conversation with Dr. CardioBot</p>
                </div>
              )}
              {chatHistory.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex gap-1 rounded-2xl bg-white/8 border border-white/10 px-3 py-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-slate-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              isLoading={sendMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
