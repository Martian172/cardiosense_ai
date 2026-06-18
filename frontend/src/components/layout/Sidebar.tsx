import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  LayoutDashboard,
  Monitor,
  ScanLine,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Live Monitor', href: '/monitor', icon: <Monitor className="h-5 w-5" /> },
  { label: 'Analyze ECG', href: '/analyze', icon: <ScanLine className="h-5 w-5" /> },
  { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { label: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useStore();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex h-full flex-col border-r border-white/10 bg-[#0a0f1e] overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
          <Activity className="h-5 w-5 text-primary animate-heartbeat" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="ml-3 overflow-hidden"
            >
              <span className="block text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent whitespace-nowrap">
                CardioSense AI
              </span>
              <span className="block text-[10px] text-slate-500 whitespace-nowrap">ECG Detection Platform</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                'transition-all duration-200',
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/20 shadow-glow-primary'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
              )
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </div>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
