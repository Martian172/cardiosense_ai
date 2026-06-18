import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2.5', isAssistant ? 'flex-row' : 'flex-row-reverse')}
    >
      {/* Avatar */}
      {isAssistant && (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/30 mt-1">
          <Activity className="h-3.5 w-3.5 text-primary" />
        </div>
      )}

      {/* Bubble */}
      <div className={cn('max-w-[80%] space-y-1', isAssistant ? 'items-start' : 'items-end', 'flex flex-col')}>
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm leading-relaxed',
            isAssistant
              ? 'bg-white/8 border border-white/10 text-slate-200 rounded-tl-sm'
              : 'bg-primary/20 border border-primary/30 text-slate-100 rounded-tr-sm',
          )}
        >
          {/* Render markdown-ish content */}
          {message.content.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < message.content.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-slate-600">
          {format(new Date(message.timestamp), 'HH:mm')}
        </p>
      </div>
    </motion.div>
  );
}
