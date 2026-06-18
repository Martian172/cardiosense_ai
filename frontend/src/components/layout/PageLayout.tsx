import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ChatWidget } from '@/components/chat/ChatWidget';

interface PageLayoutProps {
  children: ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="flex h-screen bg-[#0a0f1e] overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <ChatWidget />
    </div>
  );
}
