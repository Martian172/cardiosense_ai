import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  User,
  Bell,
  Shield,
  Key,
  LogOut,
  Save,
  Trash2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '@/store/useStore';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api', label: 'API Keys', icon: Key },
];

function ProfileTab() {
  const { user } = useStore();
  const [name, setName] = useState(user?.full_name ?? '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    toast.success('Profile updated!');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <p className="text-xs text-slate-500">Update your profile details</p>
        </CardHeader>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-primary">
              {(user?.full_name ?? 'U')[0].toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary border-2 border-base flex items-center justify-center">
              <Check className="h-2.5 w-2.5 text-base" strokeWidth={3} />
            </div>
          </div>
          <div>
            <p className="font-semibold text-slate-100">{user?.full_name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
          <Input
            label="Email Address"
            value={user?.email ?? ''}
            disabled
            hint="Email cannot be changed"
          />
        </div>

        <div className="flex justify-end mt-4">
          <Button
            variant="primary"
            leftIcon={saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            onClick={handleSave}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card padding="lg" className="border-danger/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-danger" />
            <CardTitle className="text-danger">Danger Zone</CardTitle>
          </div>
          <p className="text-xs text-slate-500">Irreversible actions</p>
        </CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Delete Account</p>
            <p className="text-xs text-slate-500">Permanently delete your account and all ECG scan data</p>
          </div>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => toast.error('Account deletion is disabled in the demo.')}
          >
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const [toggles, setToggles] = useState({
    anomalyAlerts: true,
    weeklySummary: true,
    systemUpdates: false,
    emailAlerts: true,
  });

  const toggle = (key: keyof typeof toggles) => {
    setToggles((t) => ({ ...t, [key]: !t[key] }));
    toast.success('Preference updated');
  };

  const items = [
    { key: 'anomalyAlerts' as const, label: 'Anomaly Alerts', desc: 'Notify when an ECG anomaly is detected' },
    { key: 'weeklySummary' as const, label: 'Weekly Summary', desc: 'Receive a weekly scan analytics digest' },
    { key: 'systemUpdates' as const, label: 'System Updates', desc: 'News about CardioSense AI features' },
    { key: 'emailAlerts' as const, label: 'Email Alerts', desc: 'Send notifications to your email address' },
  ];

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <p className="text-xs text-slate-500">Choose when and how you're notified</p>
      </CardHeader>
      <div className="space-y-4">
        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div>
              <p className="text-sm font-medium text-slate-200">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                toggles[key] ? 'bg-primary' : 'bg-white/10',
              )}
              role="switch"
              aria-checked={toggles[key]}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
                  toggles[key] ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SecurityTab() {
  const { clearAuth } = useStore();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const handleChangePassword = () => {
    if (!currentPw || !newPw) return toast.error('Please fill in all fields.');
    if (newPw !== confirmPw) return toast.error('Passwords do not match.');
    if (newPw.length < 8) return toast.error('Password must be at least 8 characters.');
    toast.success('Password updated successfully!');
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
  };

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <p className="text-xs text-slate-500">Use a strong password with at least 8 characters</p>
        </CardHeader>
        <div className="space-y-4">
          <Input type="password" label="Current Password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" />
          <Input type="password" label="New Password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" />
          <Input type="password" label="Confirm New Password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" />
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="primary" leftIcon={<Shield className="h-4 w-4" />} onClick={handleChangePassword}>
            Update Password
          </Button>
        </div>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <p className="text-xs text-slate-500">Manage active sessions</p>
        </CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Sign Out Everywhere</p>
            <p className="text-xs text-slate-500">Revoke all active sessions and sign out</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<LogOut className="h-4 w-4" />} onClick={clearAuth}>
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ApiKeyTab() {
  const [copied, setCopied] = useState(false);
  const mockKey = 'cs-live-xK9mP2nQrT8vLwXy4ZeA1bCd3FgHiJk';

  const copyKey = () => {
    navigator.clipboard.writeText(mockKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <p className="text-xs text-slate-500">Use these keys to access the CardioSense API programmatically</p>
      </CardHeader>
      <div className="space-y-4">
        <div className="rounded-lg bg-white/5 border border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Live API Key</p>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-slate-300 bg-black/20 px-3 py-2 rounded-lg truncate">
              {mockKey}
            </code>
            <Button size="sm" variant={copied ? 'primary' : 'ghost'} onClick={copyKey}>
              {copied ? <Check className="h-4 w-4" /> : 'Copy'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          ⚠️ Keep your API key secret. Don't share it or commit it to version control.
        </p>
        <Button variant="ghost" size="sm" leftIcon={<Key className="h-4 w-4" />} onClick={() => toast.success('New API key generated!')}>
          Regenerate Key
        </Button>
      </div>
    </Card>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabContent: Record<string, React.ReactNode> = {
    profile: <ProfileTab />,
    notifications: <NotificationsTab />,
    security: <SecurityTab />,
    api: <ApiKeyTab />,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">Manage your account, preferences, and integrations</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar tabs */}
        <nav className="sm:w-48 flex sm:flex-col gap-1 shrink-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left w-full',
                activeTab === id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
          >
            {tabContent[activeTab]}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
