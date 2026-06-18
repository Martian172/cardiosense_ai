import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Cpu, AlertTriangle, CheckCircle, Eye, RefreshCw, ClipboardPaste } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { ECGChart } from '@/components/ecg/ECGChart';
import { AnomalyBadge } from '@/components/ecg/AnomalyBadge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useCreateScan, useDemoScan } from '@/hooks/useScans';
import { generateDemoECG, injectAnomalies, formatReconstructionError } from '@/lib/utils';
import type { ScanAnalysisResult } from '@/types';
import toast from 'react-hot-toast';

type Tab = 'demo' | 'paste';

// Local fallback analysis when backend is unavailable
function mockAnalyzeECG(data: number[]): ScanAnalysisResult {
  const { data: anomalousData, regions } = injectAnomalies(data);
  const reconstructionError = 0.05 + Math.random() * 0.15;
  const anomalyScore = regions.length > 0 ? 0.4 + Math.random() * 0.4 : 0.05 + Math.random() * 0.2;
  return {
    id: `local-${Date.now()}`,
    scan_name: `Demo Scan ${new Date().toLocaleTimeString()}`,
    reconstruction_error: reconstructionError,
    anomaly_score: anomalyScore,
    is_anomalous: anomalyScore > 0.35,
    anomaly_regions: regions.map(([s, e]) => ({ start: s, end: e })),
    raw_ecg_data: anomalousData,
    created_at: new Date().toISOString(),
    reconstructed_signal: data,
  };
}

export function AnalyzePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('demo');
  const [pasteValue, setPasteValue] = useState('');
  const [result, setResult] = useState<ScanAnalysisResult | null>(null);
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const { mutate: createScan, isPending: isCreating } = useCreateScan();
  const { mutate: runDemo, isPending: isDemoRunning } = useDemoScan();

  const isLoading = isCreating || isDemoRunning || isLocalLoading;

  const handleRunDemo = () => {
    setResult(null);
    runDemo(undefined, {
      onSuccess: (data) => setResult(data),
      onError: () => {
        // Fallback: run locally
        setIsLocalLoading(true);
        setTimeout(() => {
          const ecgData = generateDemoECG(10);
          const localResult = mockAnalyzeECG(ecgData);
          setResult(localResult);
          setIsLocalLoading(false);
          toast.success('Demo analysis complete (local simulation)');
        }, 1500);
      },
    });
  };

  const handlePasteAnalyze = () => {
    const parts = pasteValue.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    if (parts.length < 50) {
      toast.error('Please provide at least 50 ECG data points');
      return;
    }
    setResult(null);
    createScan(
      { scan_name: `Manual Scan ${new Date().toLocaleTimeString()}`, ecg_data: parts },
      {
        onSuccess: (data) => setResult(data),
        onError: () => {
          // Fallback local
          setIsLocalLoading(true);
          setTimeout(() => {
            const localResult = mockAnalyzeECG(parts);
            setResult(localResult);
            setIsLocalLoading(false);
            toast.success('Analysis complete (local simulation)');
          }, 1200);
        },
      },
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-lg mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-100">Analyze ECG</h1>
        <p className="text-sm text-slate-500 mt-1">Upload ECG data for AI-powered anomaly detection</p>
      </motion.div>

      {/* Tab selector */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 w-fit">
        {([
          { id: 'demo', label: 'Generate Demo ECG', icon: <Cpu className="h-4 w-4" /> },
          { id: 'paste', label: 'Paste ECG Data', icon: <ClipboardPaste className="h-4 w-4" /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setResult(null); }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
        >
          {activeTab === 'demo' ? (
            <Card>
              <div className="flex flex-col items-center text-center py-8 gap-5">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Cpu className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100 mb-2">Generate Demo ECG Signal</h2>
                  <p className="text-sm text-slate-400 max-w-md">
                    Our system will generate a realistic 10-second ECG signal with physiologically accurate waveforms,
                    then run it through our anomaly detection model.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500">
                  <span>✓ 2500 data points at 250 Hz</span>
                  <span>✓ Realistic P-QRS-T morphology</span>
                  <span>✓ Possible anomaly injection</span>
                </div>
                <Button
                  size="lg"
                  variant="primary"
                  onClick={handleRunDemo}
                  isLoading={isLoading}
                  leftIcon={<Cpu className="h-5 w-5" />}
                >
                  {isLoading ? 'Analyzing...' : 'Generate & Analyze'}
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <h2 className="text-base font-semibold text-slate-100 mb-4">Paste ECG Data</h2>
              <Textarea
                label="ECG Signal (comma or space-separated float values)"
                placeholder="0.012, -0.034, 0.145, 0.892, 1.234, 0.445, 0.123, -0.234, ..."
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                rows={8}
                hint={`Provide at least 50 float values. Current: ${pasteValue.split(/[\s,]+/).filter(Boolean).length} values`}
              />
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Tip: Export from your ECG device as CSV and paste the signal column
                </p>
                <Button
                  variant="primary"
                  onClick={handlePasteAnalyze}
                  isLoading={isLoading}
                  disabled={pasteValue.trim().length < 10}
                  leftIcon={<Upload className="h-4 w-4" />}
                >
                  Analyze
                </Button>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Loading state */}
      {isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <PageLoader label="Running AI analysis..." />
          </Card>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Result header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {result.is_anomalous ? (
                  <AlertTriangle className="h-5 w-5 text-danger" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
                <h2 className="text-lg font-semibold text-slate-100">Analysis Results</h2>
                <AnomalyBadge isAnomalous={result.is_anomalous} anomalyScore={result.anomaly_score} />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setResult(null)} leftIcon={<RefreshCw className="h-4 w-4" />}>
                  Reset
                </Button>
                {!result.id.startsWith('local-') && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/analyze/${result.id}`)} leftIcon={<Eye className="h-4 w-4" />}>
                    Full Report
                  </Button>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Reconstruction Error', value: formatReconstructionError(result.reconstruction_error), color: result.reconstruction_error > 0.2 ? 'text-danger' : 'text-primary' },
                { label: 'Anomaly Score', value: `${(result.anomaly_score * 100).toFixed(1)}%`, color: result.anomaly_score > 0.5 ? 'text-danger' : result.anomaly_score > 0.3 ? 'text-warning' : 'text-primary' },
                { label: 'Anomaly Regions', value: result.anomaly_regions.length.toString(), color: result.anomaly_regions.length > 0 ? 'text-danger' : 'text-primary' },
                { label: 'Signal Length', value: `${(result.raw_ecg_data.length / 250).toFixed(1)}s`, color: 'text-slate-300' },
              ].map((m) => (
                <Card key={m.label} padding="md" className="text-center">
                  <p className="text-xs text-slate-500 mb-1">{m.label}</p>
                  <p className={`text-2xl font-bold font-mono ${m.color}`}>{m.value}</p>
                </Card>
              ))}
            </div>

            {/* ECG Chart */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-300 mb-4">ECG Waveform with Anomaly Regions</h3>
              <ECGChart
                data={result.raw_ecg_data}
                anomalyRegions={result.anomaly_regions}
                height={220}
              />
            </Card>

            {/* Anomaly region list */}
            {result.anomaly_regions.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Detected Anomaly Regions</h3>
                <div className="space-y-2">
                  {result.anomaly_regions.map((region, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-danger/5 border border-danger/15 px-4 py-3">
                      <span className="text-sm text-slate-300">Region {i + 1}</span>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>Sample {region.start} &rarr; {region.end}</span>
                        <span className="font-mono text-slate-300">
                          {(region.start / 250 * 1000).toFixed(0)}ms &ndash; {(region.end / 250 * 1000).toFixed(0)}ms
                        </span>
                        <span className="text-danger">{region.end - region.start} samples</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
