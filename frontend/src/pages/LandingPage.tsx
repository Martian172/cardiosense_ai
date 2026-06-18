import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Activity,
  Monitor,
  Brain,
  MessageSquare,
  Eye,
  Lock,
  FileDown,
  ArrowRight,
  CheckCircle,
  Zap,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// ── Animated ECG Heartbeat SVG ────────────────────────────────────────────────
function HeartbeatSVG() {
  return (
    <div className="relative w-full h-24 overflow-hidden">
      <svg viewBox="0 0 1200 120" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ecgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0" />
            <stop offset="30%" stopColor="#00d4aa" stopOpacity="1" />
            <stop offset="70%" stopColor="#00d4aa" stopOpacity="1" />
            <stop offset="100%" stopColor="#00d4aa" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* ECG path — repeated pattern */}
        <path
          d="M0,60 L60,60 L80,60 L100,30 L110,60 L130,60 L150,60 
             L160,60 L170,10 L185,90 L195,60 L210,60 L240,60
             L260,60 L280,30 L290,60 L310,60 L330,60
             L340,60 L350,10 L365,90 L375,60 L390,60 L420,60
             L440,60 L460,30 L470,60 L490,60 L510,60
             L520,60 L530,10 L545,90 L555,60 L570,60 L600,60
             L620,60 L640,30 L650,60 L670,60 L690,60
             L700,60 L710,10 L725,90 L735,60 L750,60 L780,60
             L800,60 L820,30 L830,60 L850,60 L870,60
             L880,60 L890,10 L905,90 L915,60 L930,60 L960,60
             L980,60 L1000,30 L1010,60 L1030,60 L1050,60
             L1060,60 L1070,10 L1085,90 L1095,60 L1110,60 L1200,60"
          fill="none"
          stroke="url(#ecgGradient)"
          strokeWidth="2.5"
          filter="url(#glow)"
          className="ecg-path-animate"
          style={{
            strokeDasharray: 2000,
            strokeDashoffset: 2000,
            animation: 'ecgDraw 4s linear infinite',
          }}
        />
      </svg>
      <style>{`
        @keyframes ecgDraw {
          0% { stroke-dashoffset: 2000; opacity: 0.3; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: -2000; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

// ── Hero ECG Animation ─────────────────────────────────────────────────────────
function HeroECGAnimation() {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#0d1530]/80 backdrop-blur-xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-danger animate-pulse" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Live ECG Monitor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">72 BPM</span>
          <Heart className="h-3.5 w-3.5 text-danger animate-heartbeat" />
        </div>
      </div>

      {/* ECG waveform */}
      <div className="relative bg-[#060c1a] rounded-lg p-3 overflow-hidden">
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,212,170,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.3) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <HeartbeatSVG />
        {/* Scan line overlay */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-primary to-transparent opacity-60 animate-scan-line" />
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Heart Rate', value: '72 BPM', color: 'text-primary' },
          { label: 'SpO₂', value: '98%', color: 'text-secondary-300' },
          { label: 'Status', value: 'Normal', color: 'text-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-white/5 border border-white/10 p-2.5 text-center">
            <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* AI badge */}
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
        <Brain className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <p className="text-xs text-primary">AI Model: No anomaly detected — confidence 98.7%</p>
      </div>
    </div>
  );
}

// ── Section Wrapper with animation ───────────────────────────────────────────
function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Features Data ─────────────────────────────────────────────────────────────
const features = [
  {
    icon: <Monitor className="h-6 w-6" />,
    title: 'Real-time Monitoring',
    description: 'Stream live ECG data with sub-50ms latency. Get instant alerts when anomalies are detected.',
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
  },
  {
    icon: <Brain className="h-6 w-6" />,
    title: 'AI Anomaly Detection',
    description: 'Deep learning autoencoder trained on 100K+ ECG samples. 99.2% accuracy in anomaly detection.',
    color: 'text-secondary-300',
    bg: 'bg-secondary/10 border-secondary/20',
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: 'Dr. CardioBot',
    description: 'AI-powered cardiology assistant. Ask natural language questions about your ECG findings.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: 'Explainable AI',
    description: 'Visualize exactly which ECG regions triggered anomaly detection with highlighted waveforms.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: <Lock className="h-6 w-6" />,
    title: 'Secure & Private',
    description: 'End-to-end encryption, HIPAA-compliant data handling. Your health data stays private.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
  },
  {
    icon: <FileDown className="h-6 w-6" />,
    title: 'Export Reports',
    description: 'Generate detailed PDF reports with ECG charts, anomaly scores, and AI analysis summaries.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
];

// ── How It Works ──────────────────────────────────────────────────────────────
const steps = [
  { num: '01', title: 'Upload or Stream ECG', desc: 'Connect your ECG device or upload recorded data in standard formats.' },
  { num: '02', title: 'AI Analysis', desc: 'Our autoencoder model analyzes the signal in real-time, computing reconstruction error.' },
  { num: '03', title: 'Anomaly Detection', desc: 'Detected anomaly regions are highlighted and scored with confidence percentages.' },
  { num: '04', title: 'AI Consultation', desc: 'Ask Dr. CardioBot to explain findings in plain language and get clinical context.' },
];

// ── Main Landing Page ─────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100 font-sans overflow-x-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-secondary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 h-64 w-64 rounded-full bg-danger/3 blur-[100px]" />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 shadow-glow-primary">
              <Activity className="h-5 w-5 text-primary animate-heartbeat" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                CardioSense AI
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Demo'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div>
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5"
            >
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Powered by Deep Learning</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
            >
              <span className="text-slate-100">AI-Powered</span>{' '}
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-secondary bg-clip-text text-transparent">
                ECG Anomaly
              </span>
              <br />
              <span className="text-slate-100">Detection</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-slate-400 mb-8 max-w-xl leading-relaxed"
            >
              Real-time ECG monitoring with deep learning anomaly detection. Get instant alerts,
              explainable AI insights, and consult Dr. CardioBot for clinical guidance.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-4 mb-10"
            >
              <Link to="/register">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="h-5 w-5" />}>
                  Start Free Demo
                </Button>
              </Link>
              <Link to="/monitor">
                <Button size="lg" variant="outline" leftIcon={<Monitor className="h-5 w-5" />}>
                  View Live ECG
                </Button>
              </Link>
            </motion.div>

            {/* Floating stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              {[
                { value: '99.2%', label: 'Accuracy' },
                { value: '< 50ms', label: 'Latency' },
                { value: '24/7', label: 'Monitoring' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm">
                    <span className="font-semibold text-slate-200">{stat.value}</span>{' '}
                    <span className="text-slate-500">{stat.label}</span>
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Hero visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="relative"
          >
            <HeroECGAnimation />

            {/* Floating cards */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-6 -left-6 rounded-xl border border-white/10 bg-[#0d1530]/90 backdrop-blur px-4 py-3 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                <span className="text-xs font-medium text-danger">Anomaly Detected</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Score: 87.3%</p>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -bottom-4 -right-4 rounded-xl border border-white/10 bg-[#0d1530]/90 backdrop-blur px-4 py-3 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-secondary-300" />
                <span className="text-xs font-medium text-slate-300">AI Analysis</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Processed in 23ms</p>
            </motion.div>
          </motion.div>
        </div>

        {/* Full-width ECG strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 rounded-2xl border border-white/5 bg-[#060c1a] p-4 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Continuous ECG Feed</span>
            </div>
            <span className="text-xs text-slate-600">Lead II · 250 Hz</span>
          </div>
          <div className="relative"
            style={{
              backgroundImage: 'linear-gradient(rgba(0,212,170,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.04) 1px, transparent 1px)',
              backgroundSize: '25px 25px',
            }}
          >
            <HeartbeatSVG />
          </div>
        </motion.div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <AnimatedSection className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Features</p>
          <h2 className="text-4xl font-bold text-slate-100 mb-4">
            Everything you need for{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              cardiac monitoring
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Built for clinicians and researchers. Powered by state-of-the-art deep learning.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <AnimatedSection key={feature.title}>
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <Card hoverable padding="lg" className="h-full">
                  <div className={`mb-4 w-fit rounded-xl border p-3 ${feature.bg} ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-semibold text-slate-100 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
        <AnimatedSection className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary-300 mb-3">How It Works</p>
          <h2 className="text-4xl font-bold text-slate-100 mb-4">
            From signal to insight in{' '}
            <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              milliseconds
            </span>
          </h2>
        </AnimatedSection>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <AnimatedSection key={step.num}>

                <div className="flex flex-col items-center text-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary font-bold text-lg shadow-glow-primary"
                  >
                    {step.num}
                  </motion.div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo Preview ── */}
      <section id="demo" className="mx-auto max-w-7xl px-6 py-20">
        <AnimatedSection>
          <div className="rounded-2xl border border-white/10 bg-[#0d1530]/60 backdrop-blur-xl p-8">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Live Demo</p>
              <h2 className="text-3xl font-bold text-slate-100 mb-4">See CardioSense AI in action</h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Our demo environment generates realistic ECG signals and runs them through our anomaly detection pipeline.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#060c1a] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">ECG Analysis Output</span>
                  <span className="text-xs text-danger font-medium animate-pulse">⚡ Anomaly Detected</span>
                </div>
                <div
                  className="relative rounded-lg"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(0,212,170,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.04) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  <HeartbeatSVG />
                  {/* Anomaly overlay */}
                  <div className="absolute top-0 bottom-0 bg-danger/15 border-x border-danger/30 rounded"
                    style={{ left: '42%', width: '18%' }} />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Reconstruction Error', value: '0.2847', color: 'text-danger' },
                  { label: 'Anomaly Score', value: '78.4%', color: 'text-warning' },
                  { label: 'Anomaly Regions', value: '2 detected', color: 'text-danger' },
                  { label: 'Confidence', value: '94.2%', color: 'text-primary' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/10 bg-white/3 p-4">
                    <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                    <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Link to="/register">
                <Button size="lg" variant="primary" rightIcon={<ChevronRight className="h-5 w-5" />}>
                  Try Full Demo Free
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-[#060c1a]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-slate-300">CardioSense AI</span>
            </div>

            <div className="flex gap-6 text-sm text-slate-500">
              {['Privacy Policy', 'Terms of Service', 'Contact', 'Documentation'].map((link) => (
                <a key={link} href="#" className="hover:text-slate-300 transition-colors">{link}</a>
              ))}
            </div>

            <p className="text-xs text-slate-600">© 2026 CardioSense AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
