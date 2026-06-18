import { Badge } from '@/components/ui/Badge';
import { getAnomalySeverity, formatAnomalyScore } from '@/lib/utils';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface AnomalyBadgeProps {
  isAnomalous: boolean;
  anomalyScore: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export function AnomalyBadge({ isAnomalous, anomalyScore, size = 'md', showScore = true }: AnomalyBadgeProps) {
  if (!isAnomalous) {
    return (
      <Badge variant="success" dot pulse={false}>
        <CheckCircle className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        <span>Normal</span>
        {showScore && <span className="opacity-70">({formatAnomalyScore(anomalyScore)})</span>}
      </Badge>
    );
  }

  const severity = getAnomalySeverity(anomalyScore);

  if (severity === 'critical') {
    return (
      <Badge variant="danger" dot pulse>
        <AlertCircle className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        <span>Critical Anomaly</span>
        {showScore && <span className="opacity-70">({formatAnomalyScore(anomalyScore)})</span>}
      </Badge>
    );
  }

  return (
    <Badge variant="warning" dot pulse>
      <AlertTriangle className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      <span>Anomaly Detected</span>
      {showScore && <span className="opacity-70">({formatAnomalyScore(anomalyScore)})</span>}
    </Badge>
  );
}
