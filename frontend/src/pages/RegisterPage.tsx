import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

interface FormData {
  full_name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  full_name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const { register: registerUser, isRegistering } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<FormData>({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const setField = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required';
    if (!form.email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    registerUser({ full_name: form.full_name, email: form.email, password: form.password });
  };

  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 h-96 w-96 rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30 shadow-glow-primary">
              <Activity className="h-7 w-7 text-primary animate-heartbeat" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                CardioSense AI
              </h1>
              <p className="text-sm text-slate-500 mt-1">Create your free account</p>
            </div>
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Dr. Jane Smith"
              value={form.full_name}
              onChange={setField('full_name')}
              error={errors.full_name}
              leftIcon={<User className="h-4 w-4" />}
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              placeholder="doctor@hospital.com"
              value={form.email}
              onChange={setField('email')}
              error={errors.email}
              leftIcon={<Mail className="h-4 w-4" />}
              autoComplete="email"
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={setField('password')}
                error={errors.password}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                autoComplete="new-password"
              />
              {/* Password strength bar */}
              {form.password && (
                <div className="flex gap-1 mt-1.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        passwordStrength >= level
                          ? level <= 1 ? 'bg-danger' : level <= 2 ? 'bg-warning' : level <= 3 ? 'bg-primary' : 'bg-emerald-400'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-slate-500 ml-2 whitespace-nowrap">
                    {['', 'Weak', 'Fair', 'Strong', 'Very Strong'][passwordStrength]}
                  </span>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={setField('confirmPassword')}
              error={errors.confirmPassword}
              leftIcon={<Lock className="h-4 w-4" />}
              autoComplete="new-password"
            />

            {/* Benefits */}
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-1.5">
              {['Free 30-day trial', 'Unlimited ECG analyses', 'Dr. CardioBot included'].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs text-slate-400">{benefit}</span>
                </div>
              ))}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isRegistering}
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Create Account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary-400 font-medium transition-colors">
              Sign in
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-slate-600">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-slate-500 hover:text-slate-400">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-slate-500 hover:text-slate-400">Privacy Policy</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
