import { useState, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-white/10 px-3 py-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Dr. CardioBot..."
        disabled={disabled || isLoading}
        rows={1}
        className={cn(
          'flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2',
          'text-sm text-slate-200 placeholder:text-slate-600',
          'focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30',
          'transition-all duration-200 max-h-24 min-h-[36px]',
          'disabled:opacity-50',
        )}
        style={{ height: 'auto' }}
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || isLoading || disabled}
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
          'transition-all duration-200',
          value.trim() && !isLoading
            ? 'bg-primary text-base-50 hover:bg-primary-600 shadow-glow-primary'
            : 'bg-white/5 text-slate-600 cursor-not-allowed',
        )}
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
