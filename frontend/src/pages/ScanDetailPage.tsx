import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare, Save, Activity, AlertTriangle, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';
import { ECGChart } from '@/components/ecg/ECGChart';
import { ReconstructionChart } from '@/components/ecg/ReconstructionChart';
import { AnomalyBadge } from '@/components/ecg/AnomalyBadge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useScan, useUpdateScanNotes } from '@/hooks/useScans';
import { useStore } from '@/store/useStore';
import { formatDate, formatReconstructionError } from '@/lib/utils';

// Anomaly score gauge component
function AnomalyGauge({ score }: { score: number }) {
  const pct = Math.min(score * 100, 100);
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#00d4aa';
  const rotation = -135 + pct * 2.7; // -135° to +135° range

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 120 80" className="w-full max-w-[180px]">
        {/* Background arc */}
        <path
          d="M 15 75 A 50 50 0 0 1 105 75"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d="M 15 75 A 50 50 0 0 1 105 75"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${pct * 1.57} 157`}
          style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
        />
        {/* Needle */}
        <line
          x1="60"
          y1="75"
          x2={60 + 35 * Math.cos((rotation * Math.PI) / 180)}
          y2={75 + 35 * Math.sin((rotation * Math.PI) / 180)}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="60" cy="75" r="4" fill={color} />
        {/* Labels */}
        <text x="12" y="68" fontSize="8" fill="#64748b">0%</text>
        <text x="54" y="22" fontSize="8" fill="#64748b" textAnchor="middle">50%</text>
        <text x="100" y="68" fontSize="8" fill="#64748b">100%</text>
      </svg>
      <div className="text-center -mt-2">
        <p className="text-3xl font-bold font-mono" style={{ color }}>{pct.toFixed(1)}%</p>
        <p className="text-xs text-slate-500 mt-1">Anomaly Score</p>
      </div>
    </div>
  );
}

export function ScanDetailPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const { data: scan, isLoading, error } = useScan(scanId);
  const { mutate: saveNotes, isPending: isSavingNotes } = useUpdateScanNotes();
  const { setChatOpen, setActiveScanId } = useStore();
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  const handleSaveNotes = () => {
    if (!scanId) return;
    saveNotes({ id: scanId, notes }, {
      onSuccess: () => setNotesSaved(true),
    });
  };

  const handleAskCardioBot = () => {
    if (scanId) {
      setActiveScanId(scanId);
      setChatOpen(true);
    }
  };

  if (isLoading) return <PageLoader label="Loading scan details..." />;

  if (error || !scan) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-danger" />
        <p className="text-slate-400">Scan not found or failed to load</p>
        <Button variant="outline" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-100">{scan.scan_name}</h1>
            <AnomalyBadge isAnomalous={scan.is_anomalous} anomalyScore={scan.anomaly_score} />
          </div>
        </div>
        <p className="text-sm text-slate-500 ml-16">Analyzed {formatDate(scan.created_at)}</p>
      </motion.div>

      {/* Main layout: 2-col */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Charts */}
        <div className="lg:col-span-2 space-y-5">
          {/* ECG Chart with anomaly regions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Raw ECG Signal
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{scan.raw_ecg_data.length} samples</span>
                {scan.anomaly_regions.length > 0 && (
                  <Badge variant="danger" size="sm" dot>
                    {scan.anomaly_regions.length} region{scan.anomaly_regions.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <ECGChart
              data={scan.raw_ecg_data}
              anomalyRegions={scan.anomaly_regions}
              height={220}
            />
          </Card>

          {/* Reconstruction overlay */}
          {scan.reconstructed_signal && scan.reconstructed_signal.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-secondary-300" />
                  Original vs Reconstructed
                </CardTitle>
                <span className="text-xs text-slate-500">Autoencoder output</span>
              </CardHeader>
              <ReconstructionChart
                original={scan.raw_ecg_data}
                reconstructed={scan.reconstructed_signal}
                anomalyRegions={scan.anomaly_regions}
                height={200}
              />
              <p className="mt-2 text-xs text-slate-600">
                Anomaly regions are where the reconstruction error is highest (original ≠ reconstructed).
              </p>
            </Card>
          )}

          {/* Anomaly regions detail */}
          {scan.anomaly_regions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                  Detected Anomaly Regions
                </CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {scan.anomaly_regions.map((region, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-danger/5 border border-danger/15 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                      <span className="text-sm font-medium text-slate-300">Region {i + 1}</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-slate-400">
                      <span>Samples {region.start}–{region.end}</span>
                      <span className="font-mono">{(region.start / 250 * 1000).toFixed(0)}–{(region.end / 250 * 1000).toFixed(0)} ms</span>
                      <Badge variant="danger" size="sm">{region.end - region.start} pts</Badge>
                    </div>
                  </div>
                ))}

              </div>
            </Card>
          )}
        </div>

        {/* Right: Stats + notes */}
        <div className="space-y-5">
          {/* Gauge */}
          <Card>
            <CardHeader>
              <CardTitle>Anomaly Score</CardTitle>
            </CardHeader>
            <AnomalyGauge score={scan.anomaly_score} />
          </Card>

          {/* Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Scan Metrics</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {[
                { label: 'Reconstruction Error', value: formatReconstructionError(scan.reconstruction_error), highlight: scan.reconstruction_error > 0.2 },
                { label: 'Signal Duration', value: `${(scan.raw_ecg_data.length / 250).toFixed(1)} seconds` },
                { label: 'Data Points', value: scan.raw_ecg_data.length.toLocaleString() },
                { label: 'Anomaly Regions', value: scan.anomaly_regions.length.toString(), highlight: scan.anomaly_regions.length > 0 },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-xs text-slate-500">{m.label}</span>
                  <span className={`text-sm font-mono font-medium ${m.highlight ? 'text-danger' : 'text-slate-300'}`}>
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Clinical Notes</CardTitle>
            </CardHeader>
            <Textarea
              placeholder="Add clinical observations or notes..."
              value={notes || scan.notes || ''}
              onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
              rows={4}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={handleSaveNotes}
              isLoading={isSavingNotes}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {notesSaved ? '✓ Saved' : 'Save Notes'}
            </Button>
          </Card>

          {/* Ask CardioBot */}
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <button
              onClick={handleAskCardioBot}
              className="w-full rounded-xl border border-primary/30 bg-primary/10 p-4 text-left hover:bg-primary/15 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                  <MessageSquare className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Ask Dr. CardioBot</p>
                  <p className="text-xs text-slate-500">AI Cardiology Assistant</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Get AI-powered clinical interpretation of this scan's findings, anomaly severity, and recommended follow-up actions.
              </p>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
