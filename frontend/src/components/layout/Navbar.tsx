import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Bell, LogOut, User, Settings } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const { user } = useStore();
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0f1e]/80 backdrop-blur-xl"
    >
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-slate-100 hidden sm:block">CardioSense AI</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
          </Button>

          {/* User menu */}
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/30 border border-primary/40">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs text-slate-300 hidden sm:block max-w-[120px] truncate">
              {user?.full_name ?? user?.email ?? 'User'}
            </span>
          </div>

          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
