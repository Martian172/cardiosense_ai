import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Trash2, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AnomalyBadge } from '@/components/ecg/AnomalyBadge';
import { SkeletonBlock } from '@/components/ui/LoadingSpinner';
import { formatDate, formatReconstructionError } from '@/lib/utils';
import { useDeleteScan } from '@/hooks/useScans';
import type { ScanListItem } from '@/types';

interface ScanHistoryTableProps {
  scans: ScanListItem[] | undefined;
  isLoading: boolean;
}

export function ScanHistoryTable({ scans, isLoading }: ScanHistoryTableProps) {
  const navigate = useNavigate();
  const { mutate: deleteScan, isPending: isDeleting } = useDeleteScan();

  return (
    <Card padding="none">
      <CardHeader className="px-6 pt-5 pb-4 border-b border-white/10">
        <CardTitle>Recent Scans</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/analytics')}
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          View All
        </Button>
      </CardHeader>

      {isLoading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : !scans?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <Eye className="h-6 w-6 text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-400">No scans yet</p>
          <p className="text-xs text-slate-600 mt-1">Run your first ECG analysis to see results here</p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={() => navigate('/analyze')}
          >
            Analyze ECG
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {scans.map((scan, i) => (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/3 transition-colors group"
            >
              {/* Anomaly indicator */}
              <div
                className={`h-2 w-2 flex-shrink-0 rounded-full ${
                  scan.is_anomalous ? 'bg-danger animate-pulse' : 'bg-primary'
                }`}
              />

              {/* Scan name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{scan.scan_name}</p>
                <p className="text-xs text-slate-500">{formatDate(scan.created_at)}</p>
              </div>

              {/* Reconstruction error */}
              <div className="hidden md:block text-center">
                <p className="text-xs text-slate-500">Error</p>
                <p className="text-sm font-mono text-slate-300">{formatReconstructionError(scan.reconstruction_error)}</p>
              </div>

              {/* Badge */}
              <AnomalyBadge
                isAnomalous={scan.is_anomalous}
                anomalyScore={scan.anomaly_score}
                size="sm"
                showScore={false}
              />

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/analyze/${scan.id}`)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={isDeleting}
                  onClick={() => deleteScan(scan.id)}
                  className="hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}
