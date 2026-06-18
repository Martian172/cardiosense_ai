import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Heart,
  Activity,
  Zap,
  AlertTriangle,
  Play,
  Square,
  Signal,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ECGStreamChart } from '@/components/ecg/ECGStreamChart';
import { useECGStream } from '@/hooks/useECGStream';
import { cn } from '@/lib/utils';

function StatPanel({
  label,
  value,
  unit,
  icon,
  color,
  pulse = false,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  pulse?: boolean;
}) {
  return (
    <Card padding="md" className="text-center">
      <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border ${color}`}>
        {icon}
      </div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline justify-center gap-1">
        <p className={`text-3xl font-bold font-mono ${color.includes('primary') ? 'text-primary' : color.includes('danger') ? 'text-danger' : 'text-secondary-300'}`}>
          {value}
        </p>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
      {pulse && <div className="mt-2 flex justify-center"><div className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" /></div>}
    </Card>
  );
}

export function MonitorPage() {
  const { data, isConnected, heartRate, signalQuality, anomalyDetected, connect, disconnect } = useECGStream();
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
    }
  };

  const signalQualityConfig = {
    excellent: { label: 'Excellent', variant: 'primary' as const, bars: 4 },
    good: { label: 'Good', variant: 'success' as const, bars: 3 },
    poor: { label: 'Poor', variant: 'warning' as const, bars: 2 },
    lost: { label: 'Lost', variant: 'danger' as const, bars: 1 },
  };
  const sqConfig = signalQualityConfig[signalQuality];

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary animate-heartbeat" />
            Live ECG Monitor
            {anomalyDetected && (
              <Badge variant="danger" dot pulse>Anomaly Active</Badge>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Real-time cardiac signal monitoring at 250 Hz</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2',
            isConnected ? 'border-primary/30 bg-primary/10' : 'border-white/10 bg-white/5',
          )}>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-primary" />
            ) : (
              <WifiOff className="h-4 w-4 text-slate-500" />
            )}
            <span className={cn('text-xs font-medium', isConnected ? 'text-primary' : 'text-slate-500')}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <Button
            variant={isConnected ? 'danger' : 'primary'}
            size="sm"
            leftIcon={isConnected ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            onClick={isConnected ? disconnect : connect}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </Button>

          <Button
            variant={isRecording ? 'danger' : 'outline'}
            size="sm"
            leftIcon={isRecording ? <Square className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            onClick={handleToggleRecording}
          >
            {isRecording ? 'Stop Recording' : 'Record'}
          </Button>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatPanel
          label="Heart Rate"
          value={heartRate || '—'}
          unit={heartRate ? 'BPM' : ''}
          icon={<Heart className="h-5 w-5 animate-heartbeat" />}
          color={heartRate > 100 || heartRate < 50 ? 'text-danger border-danger/30 bg-danger/10' : 'text-primary border-primary/30 bg-primary/10'}
          pulse={heartRate > 100 || heartRate < 50}
        />
        <StatPanel
          label="Signal Quality"
          value={sqConfig.label}
          icon={<Signal className="h-5 w-5" />}
          color={
            signalQuality === 'excellent' ? 'text-primary border-primary/30 bg-primary/10' :
            signalQuality === 'good' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
            signalQuality === 'poor' ? 'text-warning border-warning/30 bg-warning/10' :
            'text-danger border-danger/30 bg-danger/10'
          }
        />
        <StatPanel
          label="Anomaly Status"
          value={anomalyDetected ? 'ALERT' : 'Normal'}
          icon={anomalyDetected ? <AlertTriangle className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
          color={anomalyDetected ? 'text-danger border-danger/30 bg-danger/10' : 'text-primary border-primary/30 bg-primary/10'}
          pulse={anomalyDetected}
        />
        <StatPanel
          label="Data Points"
          value={data.length}
          icon={<Zap className="h-5 w-5" />}
          color="text-secondary-300 border-secondary/30 bg-secondary/10"
        />
      </div>

      {/* Main ECG Chart */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-200">Lead II — Real-Time ECG</h2>
            {isRecording && (
              <div className="flex items-center gap-1.5 text-xs text-danger">
                <div className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                REC
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">250 Hz · {data.length} pts</span>
          </div>
        </div>

        <div
          className="rounded-xl overflow-hidden relative"
          style={{
            background: '#060c1a',
            backgroundImage: 'linear-gradient(rgba(0,212,170,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.04) 1px, transparent 1px)',
            backgroundSize: '25px 25px',
          }}
        >
          {!isConnected && data.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <WifiOff className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Not connected</p>
                <Button variant="primary" size="sm" className="mt-3" onClick={connect}>
                  Connect to ECG Stream
                </Button>
              </div>
            </div>
          ) : (
            <ECGStreamChart data={data} height={280} />
          )}

          {/* Anomaly overlay alert */}
          {anomalyDetected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/20 px-3 py-1.5 backdrop-blur-sm"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-danger animate-pulse" />
              <span className="text-xs font-semibold text-danger">Anomaly Detected</span>
            </motion.div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-primary rounded" />
            <span>Normal ECG</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-danger rounded" />
            <span>Anomalous Region</span>
          </div>
        </div>
      </Card>

      {/* Signal info */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: 'Sampling Rate', value: '250 Hz' },
          { label: 'Buffer Size', value: '500 pts (2s)' },
          { label: 'Detection Mode', value: 'Autoencoder v2' },
        ].map((info) => (
          <Card key={info.label} padding="sm" className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{info.label}</span>
            <span className="text-xs font-mono text-slate-300">{info.value}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
